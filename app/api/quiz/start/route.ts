import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { createQuiz, updateUser, getUserById } from '@/lib/firebase/db';
import { getQuestionsByFilter } from '@/lib/firebase/db';
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
 * and stores it in Firestore. Returns the quiz ID.
 */
export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const quizzesRemaining = authUser.quizzesRemaining ?? 999;
    const userPersona = authUser.persona ?? 'FRESHER';
    const userProfileType = authUser.profileType ?? 'FRESHER';
    const experienceYears = authUser.experienceYears ?? undefined;
    const userQuizGoal = authUser.quizGoal ?? undefined;

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
          questions = cached.questions.map((q) => q.questionData);
          generationSource = 'interview_cache';
          void incrementServedCount(cached.questions.map((q) => q.id));
        } else {
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

            void cacheInterviewQuestions({
              company: jdCompany,
              role,
              questions,
              jdText,
            });
          } catch {
            if (cached.partialHit && cached.questions.length > 0) {
              questions = cached.questions.map((q) => q.questionData);
              generationSource = 'interview_cache';
            }
          }
        }
      } catch {
        // Cache lookup failed — fall through
      }
    }

    // ── Normal generation (non-interview or cache miss fallback) ─
    // @ts-ignore — questions may already be set from the interview cache path above
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      try {
        const raw = await groqQuizCompletion(prompt);
        const cleaned = raw
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .trim();
        questions = JSON.parse(cleaned);

        if (!Array.isArray(questions) || questions.length === 0) {
          throw new Error('Invalid AI response');
        }

        questions = postProcessQuestions(questions);

        if (userQuizGoal === 'INTERVIEW_PREP' && jdCompany) {
          const role = extractRole(jdText);
          void cacheInterviewQuestions({ company: jdCompany, role, questions, jdText });
        }
      } catch {
        // Fallback 1: question bank in Firestore
        try {
          const bankQuestions = await getQuestionsByFilter({
            skill: normalizedSkills[0],
            limit: questionCount,
          });

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
              ...(typeof q.metadata === 'object' && q.metadata !== null ? q.metadata : {}),
            }));
          } else {
            throw new Error('empty');
          }
        } catch {
          // Fallback 2: seed questions
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

    questions = postProcessQuestions(questions);

    // Persist quiz to Firestore
    const quizId = await createQuiz({
      persona: persona,
      jdCompany: jdCompany ?? null,
      jdText: jdText ?? null,
      timerMins: Math.max(5, questionCount * 2),
      questions: questions,
      quizGoal: userQuizGoal ?? 'PRACTICE',
    });

    // Decrement quiz quota
    await updateUser(authUser.id, {
      quizzesRemaining: Math.max(0, quizzesRemaining - 1),
    });

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
