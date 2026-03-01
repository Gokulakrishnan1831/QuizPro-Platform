import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { groqQuizCompletion } from '@/lib/ai/groq-client';
import { buildQuizPrompt, buildMixedQuizPrompt } from '@/lib/ai/prompts';
import { postProcessQuestions } from '@/lib/ai/post-process';
import { getRandomSeedQuestions } from '@/lib/ai/seed-questions';
import {
  buildInterviewGroundingContext,
  fetchCompanyInterviewPatterns,
  recordQuizGenerationTrace,
} from '@/lib/interview/retrieval';
import { extractRole } from '@/lib/interview/role-utils';
import {
  getCachedInterviewQuestions,
  cacheInterviewQuestions,
  incrementServedCount,
} from '@/lib/interview/question-cache';
import { researchAndGenerateQuestions } from '@/lib/interview/research-agent';

/**
 * POST /api/quiz/start
 *
 * Generates a new quiz using Groq AI (with seed-question fallback)
 * and stores it. Returns the quiz ID so the client can navigate to
 * the playback page.
 *
 * Body: { persona, skills[], questionCount, jdText?, jdCompany? }
 *
 * NOTE: The User, Quiz, QuizAttempt, UserProgress, and Leaderboard models
 * are defined in schema.prisma but require `prisma db push` to create the
 * tables. Until then, the `as any` casts below are necessary. After running
 * `prisma db push && prisma generate`, remove the casts.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Cast to any until User model is migrated
    const db = prisma as any;

    const dbUser = await db.user?.findUnique?.({
      where: { id: authUser.id },
    });

    // If User table doesn't exist yet, continue with defaults
    const quizzesRemaining = dbUser?.quizzesRemaining ?? 999;
    const userPersona = dbUser?.persona ?? 'FRESHER';
    const userProfileType = dbUser?.profileType ?? 'FRESHER';
    const experienceYears = dbUser?.experienceYears ?? undefined;
    const userQuizGoal = dbUser?.quizGoal ?? undefined;

    // Quota check
    if (quizzesRemaining <= 0) {
      return NextResponse.json(
        { error: 'Quiz quota exceeded. Upgrade your plan.' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const {
      persona = userPersona,
      skills = ['SQL', 'EXCEL', 'POWERBI'],
      questionCount = 10,
      includeHandsOn = true,
      jdText,
      jdCompany,
    } = body;
    const normalizedSkills = (Array.isArray(skills) ? skills : ['SQL', 'EXCEL', 'POWERBI'])
      .map((s: string) => String(s).toUpperCase()) as Array<'SQL' | 'EXCEL' | 'POWERBI'>;

    let interviewPatterns: Awaited<ReturnType<typeof fetchCompanyInterviewPatterns>> = [];
    let interviewGroundingContext = '';
    if (userQuizGoal === 'INTERVIEW_PREP' && jdCompany) {
      try {
        interviewPatterns = await fetchCompanyInterviewPatterns({
          company: jdCompany,
          skills: normalizedSkills,
          jdText,
          maxItems: 8,
        });
        interviewGroundingContext = buildInterviewGroundingContext(interviewPatterns);
      } catch {
        interviewPatterns = [];
        interviewGroundingContext = '';
      }
    }

    // ── Build prompt using the centralized prompt library ──
    // Use the mixed prompt (MCQ + hands-on) when SQL or EXCEL are included,
    // so the LLM generates setupSQL / columns / initialData for hands-on questions.
    const hasHandsOnSkills =
      Boolean(includeHandsOn) && skills.some((s: string) => ['SQL', 'EXCEL'].includes(s.toUpperCase()));

    const prompt = hasHandsOnSkills
      ? buildMixedQuizPrompt({
        profileType: userProfileType,
        skills: normalizedSkills,
        numQuestions: questionCount,
        experienceYears,
        quizGoal: userQuizGoal,
        jdText,
        jdCompany,
        interviewGroundingContext,
      })
      : buildQuizPrompt({
        profileType: userProfileType,
        skills: normalizedSkills,
        numQuestions: questionCount,
        experienceYears,
        quizGoal: userQuizGoal,
        jdText,
        jdCompany,
        interviewGroundingContext,
      });

    let questions: any[];
    let usedFallback = false;
    let generationSource: 'ai' | 'question_bank' | 'seed' | 'interview_cache' | 'interview_research' = 'ai';

    // ── Interview Prep: cache-first question lookup ─────────────
    if (userQuizGoal === 'INTERVIEW_PREP' && jdCompany) {
      const role = extractRole(jdText);

      try {
        const cached = await getCachedInterviewQuestions({
          company: jdCompany,
          jdText,
          skills: normalizedSkills,
          questionCount,
        });

        if (cached.cacheHit) {
          // Full cache hit — serve instantly, no LLM call
          questions = cached.questions.map((q) => q.questionData);
          generationSource = 'interview_cache';
          void incrementServedCount(cached.questions.map((q) => q.id));
        } else {
          // Cache miss or partial — generate via research agent
          try {
            const generated = await researchAndGenerateQuestions({
              company: jdCompany,
              role,
              skills: normalizedSkills,
              jdText,
              questionCount: cached.partialHit
                ? questionCount - cached.questions.length
                : questionCount,
              includeHandsOn: hasHandsOnSkills,
              profileType: userProfileType,
              experienceYears,
              existingPatterns: interviewPatterns,
            });

            if (cached.partialHit) {
              const cachedQs = cached.questions.map((q) => q.questionData);
              questions = [...cachedQs, ...generated];
            } else {
              questions = generated;
            }

            generationSource = 'interview_research';

            // Cache for future requests (non-blocking)
            void cacheInterviewQuestions({
              company: jdCompany,
              role,
              questions,
              jdText,
            });
          } catch {
            // Research agent failed — fall through to normal generation
            if (cached.partialHit && cached.questions.length > 0) {
              questions = cached.questions.map((q) => q.questionData);
              generationSource = 'interview_cache';
            }
          }
        }
      } catch {
        // Cache lookup failed — fall through to normal generation
      }
    }

    // ── Normal generation (non-interview or cache miss fallback) ─
    // @ts-ignore — questions may already be set from the interview cache path above
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      try {
        const raw = await groqQuizCompletion(prompt);
        // Strip markdown fences if the LLM wrapped output
        const cleaned = raw
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .trim();
        questions = JSON.parse(cleaned);

        if (!Array.isArray(questions) || questions.length === 0) {
          throw new Error('Invalid AI response');
        }

        // Post-process: ensure SQL_HANDS_ON has setupSQL, EXCEL has grid data
        questions = postProcessQuestions(questions);

        // If this was an interview prep generation, cache for future
        if (userQuizGoal === 'INTERVIEW_PREP' && jdCompany) {
          const role = extractRole(jdText);
          void cacheInterviewQuestions({ company: jdCompany, role, questions, jdText });
        }
      } catch {
        // Fallback 1: try the question bank in Prisma (uses actual DB schema)
        try {
          const bankQuestions = await (prisma as any).question?.findMany?.({
            take: questionCount,
            where: {
              skill: { in: skills.map((s: string) => String(s).toUpperCase()) },
            },
            orderBy: { createdAt: 'desc' },
          }) ?? [];

          if (bankQuestions.length > 0) {
            usedFallback = true;
            generationSource = 'question_bank';
            questions = bankQuestions.map((q: any) => ({
              type: q.metadata?.type ?? q.type,
              skill: q.skill,
              content: q.content,
              options: q.options,
              correctAnswer: q.correctAnswer,
              solution: q.solution ?? '',
              difficulty: typeof q.difficulty === 'number' ? q.difficulty : 5,
              // Spread metadata onto the root object so SQLEditor gets setupSQL, expectedOutput, etc.
              ...(typeof q.metadata === 'object' && q.metadata !== null ? q.metadata : {}),
            }));
          } else {
            throw new Error('empty');
          }
        } catch {
          // Fallback 2: use the in-memory seed question bank
          const seedQs = getRandomSeedQuestions(skills, questionCount, hasHandsOnSkills);
          if (seedQs.length === 0) {
            return NextResponse.json(
              { error: 'Failed to generate quiz and no fallback questions available' },
              { status: 500 },
            );
          }
          usedFallback = true;
          generationSource = 'seed';
          questions = seedQs;
        }
      }
    }

    // Final safety net: post-process all questions regardless of source
    questions = postProcessQuestions(questions);

    // Persist quiz (requires Quiz table — uses `as any` until migration)
    let quizId: string;
    try {
      const quiz = await db.quiz.create({
        data: {
          persona: persona,
          jdCompany: jdCompany ?? null,
          jdText: jdText ?? null,
          timerMins: Math.max(5, questionCount * 2),
          questions: questions,
        },
      });
      quizId = quiz.id;

      // Decrement remaining quizzes
      if (dbUser) {
        await db.user.update({
          where: { id: dbUser.id },
          data: { quizzesRemaining: { decrement: 1 } },
        });
      }
    } catch {
      // Quiz table doesn't exist yet — return questions directly
      // Client will need to handle this gracefully
      quizId = crypto.randomUUID();
    }

    await recordQuizGenerationTrace({
      userId: authUser.id,
      quizId,
      quizGoal: userQuizGoal ?? 'PRACTICE',
      company: jdCompany ?? undefined,
      skills: normalizedSkills,
      model: 'groq-llama-3.1-70b-versatile',
      usedFallback,
      patterns: interviewPatterns,
      trace: {
        questionCountRequested: questionCount,
        questionCountGenerated: questions.length,
        includeHandsOn: hasHandsOnSkills,
        generationSource,
        profileType: userProfileType,
        persona,
      },
    });

    return NextResponse.json({ quizId, questionCount: questions.length, questions });
  } catch (error: any) {
    console.error('Quiz start error:', error);
    return NextResponse.json(
      { error: 'Failed to start quiz' },
      { status: 500 },
    );
  }
}
