'use server';

import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { groqQuizCompletion } from '@/lib/ai/groq-client';
import {
    buildQuizPrompt,
    buildMixedQuizPrompt,
    calculateQuizTimer,
    type ProfileType,
    type PersonaType,
    type SkillType,
    type QuizGoalType,
} from '@/lib/ai/prompts';
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

/* ─── Rate-limit map (in-memory for now) ────────────────────── */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMITS: Record<string, number> = {
    FREE: 2,
    BASIC: 5,
    PRO: 15,
    ELITE: 999, // effectively unlimited
};

function checkRateLimit(userId: string, tier: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(userId);
    const maxRequests = RATE_LIMITS[tier] ?? RATE_LIMITS.FREE;

    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return true;
    }

    if (entry.count >= maxRequests) {
        return false;
    }

    entry.count++;
    return true;
}

/* ─── Types ─────────────────────────────────────────────────── */

export interface GenerateQuizParams {
    persona?: PersonaType;
    skills?: SkillType[];
    questionCount?: number;
    includeHandsOn?: boolean;
    quizGoal?: QuizGoalType;
    jdText?: string;
    jdCompany?: string;
}

export interface GenerateQuizResult {
    success: boolean;
    quizId?: string;
    questionCount?: number;
    questions?: any[];
    timerMins?: number;
    error?: string;
}

/* ─── Server Action ─────────────────────────────────────────── */

export async function generateQuiz(
    params: GenerateQuizParams
): Promise<GenerateQuizResult> {
    try {
        // 1. Authenticate
        const supabase = await createClient();
        const {
            data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) {
            return { success: false, error: 'Unauthorized — please sign in.' };
        }

        // Cast to `any` — User/Quiz/QuizAttempt/UserProgress/Leaderboard
        // tables require `prisma db push` to create.
        const db = prisma as any;

        const dbUser = await db.user?.findUnique?.({
            where: { id: authUser.id },
        }).catch(() => null);

        const tier = dbUser?.subscriptionTier ?? 'FREE';
        const quizzesRemaining = dbUser?.quizzesRemaining ?? 999;

        // 2. Rate-limit check
        if (!checkRateLimit(authUser.id, tier)) {
            return {
                success: false,
                error: 'Rate limit exceeded. Please wait a minute before generating another quiz.',
            };
        }

        // 3. Quota check
        if (quizzesRemaining <= 0) {
            return {
                success: false,
                error: 'Quiz quota exceeded. Upgrade your plan for more quizzes.',
            };
        }

        // 4. Merge defaults — use new profileType from user record
        const profileType: ProfileType = dbUser?.profileType ?? 'FRESHER';
        const persona: PersonaType = params.persona ?? (dbUser?.persona as PersonaType) ?? 'FRESHER';
        const skills: SkillType[] = params.skills?.length
            ? params.skills
            : (dbUser?.toolStack as SkillType[]) ?? ['SQL', 'EXCEL', 'POWERBI'];
        const questionCount = params.questionCount ?? 10;
        const includeHandsOn = params.includeHandsOn ?? false;
        const effectiveIncludeHandsOn = includeHandsOn && skills.some((s) => s !== 'POWERBI');
        const quizGoal: QuizGoalType = params.quizGoal ?? (dbUser?.quizGoal as QuizGoalType) ?? 'PRACTICE';

        // Use stored JD/Company if in interview prep mode and no overrides provided
        const jdText = params.jdText ?? (quizGoal === 'INTERVIEW_PREP' ? dbUser?.upcomingJD : undefined);
        const jdCompany = params.jdCompany ?? (quizGoal === 'INTERVIEW_PREP' ? dbUser?.upcomingCompany : undefined);
        const normalizedSkills = skills.map((s) => String(s).toUpperCase()) as SkillType[];

        let interviewPatterns: Awaited<ReturnType<typeof fetchCompanyInterviewPatterns>> = [];
        let interviewGroundingContext = '';

        if (quizGoal === 'INTERVIEW_PREP' && jdCompany) {
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

        // 5. Build prompt — now using profileType instead of persona
        const prompt = effectiveIncludeHandsOn
            ? buildMixedQuizPrompt({
                profileType,
                skills: normalizedSkills,
                numQuestions: questionCount,
                handsOnRatio: 0.3,
                experienceYears: dbUser?.experienceYears ?? undefined,
                quizGoal,
                jdText,
                jdCompany,
                interviewGroundingContext,
            })
            : buildQuizPrompt({
                profileType,
                skills: normalizedSkills,
                numQuestions: questionCount,
                experienceYears: dbUser?.experienceYears ?? undefined,
                quizGoal,
                jdText,
                jdCompany,
                interviewGroundingContext,
            });

        // 6. Generate questions — cache-first for interview prep
        let questions: any[];
        let usedFallback = false;
        let generationSource: 'ai' | 'question_bank' | 'seed' | 'interview_cache' | 'interview_research' = 'ai';

        // ── Interview Prep: cache-first question lookup ──────────
        if (quizGoal === 'INTERVIEW_PREP' && jdCompany) {
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
                            includeHandsOn: effectiveIncludeHandsOn,
                            profileType,
                            experienceYears: dbUser?.experienceYears ?? undefined,
                            existingPatterns: interviewPatterns,
                        });

                        if (cached.partialHit) {
                            const cachedQs = cached.questions.map((q) => q.questionData);
                            questions = [...cachedQs, ...generated];
                        } else {
                            questions = generated;
                        }

                        generationSource = 'interview_research';
                        void cacheInterviewQuestions({ company: jdCompany, role, questions, jdText });
                    } catch {
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

        // ── Normal generation (non-interview or fallback) ────────
        // @ts-ignore — questions may already be set above
        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            try {
                const raw = await groqQuizCompletion(prompt);
                const cleaned = raw
                    .replace(/```json\s*/g, '')
                    .replace(/```\s*/g, '')
                    .trim();
                questions = JSON.parse(cleaned);

                if (!Array.isArray(questions) || questions.length === 0) {
                    throw new Error('Invalid AI response shape');
                }

                questions = postProcessQuestions(questions);

                // Cache interview prep questions for future use
                if (quizGoal === 'INTERVIEW_PREP' && jdCompany) {
                    const role = extractRole(jdText);
                    void cacheInterviewQuestions({ company: jdCompany, role, questions, jdText });
                }
            } catch {
                // Fallback 1: Prisma question bank
                try {
                    const bankQuestions = await (prisma as any).question?.findMany?.({
                        take: questionCount,
                        where: {
                            skill: { in: skills },
                        },
                        orderBy: { createdAt: 'desc' },
                    }) ?? [];

                    if (bankQuestions.length > 0) {
                        usedFallback = true;
                        generationSource = 'question_bank';
                        questions = bankQuestions.map((q: any) => ({
                            type: (q.metadata?.type ?? q.type) ?? 'MCQ',
                            skill: q.skill ?? 'SQL',
                            content: q.content,
                            options: q.options,
                            correctAnswer: q.correctAnswer,
                            solution: q.solution ?? '',
                            difficulty: q.difficulty ?? 5,
                            ...(typeof q.metadata === 'object' && q.metadata !== null ? q.metadata : {}),
                        }));
                    } else {
                        throw new Error('empty');
                    }
                } catch {
                    // Fallback 2: in-memory seed bank
                    const seedQs = getRandomSeedQuestions(skills, questionCount, effectiveIncludeHandsOn);
                    if (seedQs.length === 0) {
                        return {
                            success: false,
                            error: 'Failed to generate quiz and no fallback questions available.',
                        };
                    }
                    usedFallback = true;
                    generationSource = 'seed';
                    questions = seedQs;
                }
            }
        }

        // Final safety net: post-process all questions regardless of source
        questions = postProcessQuestions(questions);

        // 7. Calculate timer (deterministic 5-minute rounding)
        const timerMins = calculateQuizTimer(questionCount, effectiveIncludeHandsOn, profileType);

        // 8. Determine single-skill for leaderboard
        const uniqueSkills = [...new Set(questions.map((q: any) => q.skill))];
        const singleSkill = uniqueSkills.length === 1 ? uniqueSkills[0] : null;

        // 9. Persist quiz (graceful — Quiz table may not exist yet)
        let quizId: string;
        try {
            const quiz = await db.quiz.create({
                data: {
                    persona,
                    skill: singleSkill,
                    quizGoal,
                    jdCompany: jdCompany ?? null,
                    jdText: jdText ?? null,
                    timerMins,
                    questions,
                },
            });
            quizId = quiz.id;
        } catch {
            quizId = crypto.randomUUID();
        }

        await recordQuizGenerationTrace({
            userId: authUser.id,
            quizId,
            quizGoal,
            company: jdCompany ?? undefined,
            skills: normalizedSkills,
            model: 'groq-llama-3.1-70b-versatile',
            usedFallback,
            patterns: interviewPatterns,
            trace: {
                questionCountRequested: questionCount,
                questionCountGenerated: questions.length,
                includeHandsOn: effectiveIncludeHandsOn,
                generationSource,
                profileType,
                persona,
            },
        });

        // 10. Decrement remaining quizzes
        try {
            if (dbUser) {
                await db.user.update({
                    where: { id: dbUser.id },
                    data: { quizzesRemaining: { decrement: 1 } },
                });
            }
        } catch {
            // ignore — table may not exist
        }

        return {
            success: true,
            quizId,
            questionCount: questions.length,
            questions,
            timerMins,
        };
    } catch (error: any) {
        console.error('generateQuiz server action error:', error);
        return { success: false, error: 'An unexpected error occurred.' };
    }
}
