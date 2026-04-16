import { getActiveAiModel, groqQuizCompletion } from '@/lib/ai/groq-client';
import { extractAndRepairJson } from '@/lib/ai/json-repair';
import {
  buildMixedQuizPrompt,
  buildQuizPrompt,
  buildScenarioQuestionPrompt,
  calculateQuizTimer,
  type PersonaType,
  type ProfileType,
  type QuizGoalType,
  type SkillType,
} from '@/lib/ai/prompts';
import { postProcessQuestions } from '@/lib/ai/post-process';
import { getRandomSeedQuestions } from '@/lib/ai/seed-questions';
import {
  cacheInterviewQuestions,
  getCachedInterviewQuestions,
  incrementServedCount,
} from '@/lib/interview/question-cache';
import { researchAndGenerateQuestions } from '@/lib/interview/research-agent';
import {
  buildInterviewGroundingContext,
  fetchCompanyInterviewPatterns,
  recordQuizGenerationTrace,
} from '@/lib/interview/retrieval';
import { extractRole } from '@/lib/interview/role-utils';
import {
  createQuestionHistoryBatch,
  createQuiz,
  getQuestionsByFilter,
  getRecentQuestionHistory,
  updateUser,
} from '@/lib/firebase/db';
import { buildQuestionSignature, uniqueBySignature } from './question-signature';

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

interface AuthUserLike {
  id: string;
  profileType?: ProfileType | null;
  persona?: PersonaType | null;
  toolStack?: string[] | null;
  experienceYears?: number | null;
  quizGoal?: QuizGoalType | null;
  upcomingJD?: string | null;
  upcomingCompany?: string | null;
  quizzesRemaining?: number | null;
}

function sanitizeFirestoreValue(value: unknown): unknown {
  if (value === undefined) return null;
  if (value === null) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeFirestoreValue(item));
  }
  if (value instanceof Date) return value;
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = sanitizeFirestoreValue(v);
    }
    return out;
  }
  return String(value);
}

function getDifficultyBand(profileType: ProfileType, quizGoal: QuizGoalType) {
  if (profileType === 'FRESHER' && quizGoal === 'PRACTICE') return { floor: 5, ceiling: 7 };
  if (profileType === 'FRESHER' && quizGoal === 'INTERVIEW_PREP') return { floor: 6, ceiling: 8 };
  if (profileType === 'EXPERIENCED' && quizGoal === 'PRACTICE') return { floor: 6, ceiling: 8 };
  return { floor: 7, ceiling: 9 };
}

function normalizeQuestions(
  questions: any[],
  band: { floor: number; ceiling: number },
  seenSignatures: Set<string>,
  limit: number,
) {
  const processed = postProcessQuestions(questions, {
    difficultyFloor: band.floor,
    difficultyCeiling: band.ceiling,
  });
  const unique = uniqueBySignature(processed);
  const filtered = unique.filter((q) => !seenSignatures.has(buildQuestionSignature(q)));
  return filtered.slice(0, limit);
}

async function generateAiBatch(
  prompt: string,
  band: { floor: number; ceiling: number },
  seenSignatures: Set<string>,
  questionCount: number,
) {
  const raw = await groqQuizCompletion(prompt);
  const parsed = extractAndRepairJson(raw);
  if (!Array.isArray(parsed) || parsed.length === 0) return [];
  return normalizeQuestions(parsed, band, seenSignatures, questionCount);
}

export async function generateQuizForUser(
  authUser: AuthUserLike,
  params: GenerateQuizParams,
): Promise<GenerateQuizResult> {
  const quizzesRemaining = authUser.quizzesRemaining ?? 999;
  if (quizzesRemaining <= 0) {
    return { success: false, error: 'Quiz quota exceeded. Upgrade your plan for more quizzes.' };
  }

  const profileType: ProfileType = authUser.profileType ?? 'FRESHER';
  const persona: PersonaType = params.persona ?? authUser.persona ?? 'FRESHER';
  const skills: SkillType[] = params.skills?.length
    ? params.skills
    : ((authUser.toolStack as SkillType[] | null) ?? ['SQL', 'EXCEL', 'POWERBI']);
  const normalizedSkills = skills.map((s) => String(s).toUpperCase()) as SkillType[];
  const questionCount = params.questionCount ?? 10;
  const includeHandsOn = params.includeHandsOn ?? false;
  const effectiveIncludeHandsOn = includeHandsOn && normalizedSkills.some((s) => s !== 'POWERBI');
  const quizGoal: QuizGoalType = params.quizGoal ?? authUser.quizGoal ?? 'PRACTICE';
  const jdText = params.jdText ?? (quizGoal === 'INTERVIEW_PREP' ? authUser.upcomingJD ?? undefined : undefined);
  const jdCompany =
    params.jdCompany ?? (quizGoal === 'INTERVIEW_PREP' ? authUser.upcomingCompany ?? undefined : undefined);
  const band = getDifficultyBand(profileType, quizGoal);

  const recent = await getRecentQuestionHistory({
    userId: authUser.id,
    sinceDays: 90,
    skills: normalizedSkills,
  });
  const seenSignatures = new Set(recent.map((x) => x.questionSignature));

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

  const prompt = effectiveIncludeHandsOn
    ? buildMixedQuizPrompt({
      profileType,
      skills: normalizedSkills,
      numQuestions: questionCount,
      handsOnRatio: 0.3,
      experienceYears: authUser.experienceYears ?? undefined,
      quizGoal,
      jdText,
      jdCompany,
      interviewGroundingContext,
      avoidQuestionFingerprints: Array.from(seenSignatures),
      difficultyFloor: band.floor,
      difficultyCeiling: band.ceiling,
    })
    : buildQuizPrompt({
      profileType,
      skills: normalizedSkills,
      numQuestions: questionCount,
      experienceYears: authUser.experienceYears ?? undefined,
      quizGoal,
      jdText,
      jdCompany,
      interviewGroundingContext,
      avoidQuestionFingerprints: Array.from(seenSignatures),
      difficultyFloor: band.floor,
      difficultyCeiling: band.ceiling,
    });

  let questions: any[] = [];
  let usedFallback = false;
  let regenAttempts = 0;
  let generationSource: 'ai' | 'question_bank' | 'seed' | 'interview_cache' | 'interview_research' = 'ai';

  if (quizGoal === 'INTERVIEW_PREP' && jdCompany) {
    const role = extractRole(jdText);
    try {
      const cached = await getCachedInterviewQuestions({
        company: jdCompany,
        jdText,
        skills: normalizedSkills as Array<'SQL' | 'EXCEL' | 'POWERBI'>,
        questionCount: questionCount * 3,
      });
      const cachedQs = normalizeQuestions(
        cached.questions.map((q) => q.questionData),
        band,
        seenSignatures,
        questionCount,
      );
      if (cachedQs.length >= questionCount) {
        questions = cachedQs.slice(0, questionCount);
        generationSource = 'interview_cache';
        void incrementServedCount(cached.questions.map((q) => q.id));
      } else {
        const generated = await researchAndGenerateQuestions({
          company: jdCompany,
          role,
          skills: normalizedSkills as Array<'SQL' | 'EXCEL' | 'POWERBI'>,
          jdText,
          questionCount: Math.max(1, questionCount - cachedQs.length),
          includeHandsOn: effectiveIncludeHandsOn,
          profileType,
          experienceYears: authUser.experienceYears ?? undefined,
          existingPatterns: interviewPatterns,
          avoidQuestionFingerprints: Array.from(seenSignatures),
          difficultyFloor: band.floor,
          difficultyCeiling: band.ceiling,
        });
        const generatedQs = normalizeQuestions(generated, band, seenSignatures, questionCount);
        questions = uniqueBySignature([...cachedQs, ...generatedQs]).slice(0, questionCount);
        generationSource = 'interview_research';
        if (questions.length > 0) {
          void cacheInterviewQuestions({ company: jdCompany, role, questions, jdText });
        }
      }
    } catch {
      // continue to generic flow
    }
  }

  if (questions.length < questionCount) {
    try {
      const aiQs = await generateAiBatch(prompt, band, seenSignatures, questionCount);
      questions = uniqueBySignature([...questions, ...aiQs]).slice(0, questionCount);
      generationSource = questions.length > 0 ? generationSource : 'ai';
    } catch {
      // fallback below
    }
  }

  while (questions.length < questionCount && regenAttempts < 2) {
    regenAttempts += 1;
    try {
      const aiQs = await generateAiBatch(prompt, band, seenSignatures, questionCount - questions.length);
      questions = uniqueBySignature([...questions, ...aiQs]).slice(0, questionCount);
    } catch {
      break;
    }
  }

  if (questions.length < questionCount) {
    usedFallback = true;
    try {
      const bankQuestions = await getQuestionsByFilter({
        skill: normalizedSkills[0],
        limit: questionCount * 4,
      });
      const mapped = bankQuestions.map((q: any) => ({
        type: (q.metadata?.type ?? q.type) ?? 'MCQ',
        skill: q.skill ?? normalizedSkills[0],
        content: q.content,
        options: q.options,
        correctAnswer: q.correctAnswer,
        solution: q.solution ?? '',
        difficulty: q.difficulty ?? 5,
        ...(typeof q.metadata === 'object' && q.metadata !== null ? q.metadata : {}),
      }));
      const bankFiltered = normalizeQuestions(mapped, band, seenSignatures, questionCount - questions.length);
      questions = uniqueBySignature([...questions, ...bankFiltered]).slice(0, questionCount);
      generationSource = 'question_bank';
    } catch {
      // continue
    }
  }

  if (questions.length < questionCount) {
    usedFallback = true;
    const seedQs = getRandomSeedQuestions(
      normalizedSkills as Array<'EXCEL' | 'SQL' | 'POWERBI' | 'PYTHON'>,
      questionCount * 4,
      effectiveIncludeHandsOn,
    );
    const seedFiltered = normalizeQuestions(seedQs, band, seenSignatures, questionCount - questions.length);
    questions = uniqueBySignature([...questions, ...seedFiltered]).slice(0, questionCount);
    generationSource = 'seed';
  }

  if (questions.length === 0) {
    return {
      success: false,
      error: 'Failed to generate quiz and no unique fallback questions available.',
    };
  }

  questions = postProcessQuestions(questions, {
    difficultyFloor: band.floor,
    difficultyCeiling: band.ceiling,
  });
  questions = sanitizeFirestoreValue(questions) as any[];

  // ── Generate 2 scenario questions (1 MCQ + 1 Subjective) ──────
  let scenarioQuestions: any[] = [];
  try {
    const scenarioPrompt = buildScenarioQuestionPrompt({
      profileType,
      experienceYears: authUser.experienceYears ?? undefined,
      skills: normalizedSkills,
      quizGoal,
    });
    const scenarioRaw = await groqQuizCompletion(scenarioPrompt);
    const scenarioParsed = extractAndRepairJson(scenarioRaw);
    if (Array.isArray(scenarioParsed) && scenarioParsed.length > 0) {
      scenarioQuestions = postProcessQuestions(scenarioParsed, {
        difficultyFloor: band.floor,
        difficultyCeiling: band.ceiling,
      });
      scenarioQuestions = sanitizeFirestoreValue(scenarioQuestions) as any[];
    }
  } catch (scenarioErr) {
    console.error('Scenario question generation failed:', scenarioErr);
    // Quiz proceeds without scenario questions — non-blocking
  }

  // Append scenario questions at the end
  questions = [...questions, ...scenarioQuestions];

  const scenarioCount = scenarioQuestions.length;
  const timerMins = calculateQuizTimer(questions.length - scenarioCount, effectiveIncludeHandsOn, profileType, scenarioCount);
  const regularSkills = [...new Set(questions.filter((q: any) => q.skill !== 'DATA_ANALYTICS').map((q: any) => q.skill))];
  const singleSkill = regularSkills.length === 1 ? regularSkills[0] : null;

  const quizId = await createQuiz({
    persona,
    skill: singleSkill,
    quizGoal,
    jdCompany: jdCompany ?? null,
    jdText: jdText ?? null,
    timerMins,
    questions,
  });

  const historyPayload = questions.map((q) => ({
    userId: authUser.id,
    quizId,
    skill: String(q.skill ?? '').toUpperCase(),
    quizGoal,
    profileType,
    questionSignature: buildQuestionSignature(q),
    questionType: String(q.type ?? 'MCQ').toUpperCase(),
  }));
  await createQuestionHistoryBatch(historyPayload);

  await updateUser(authUser.id, {
    quizzesRemaining: Math.max(0, quizzesRemaining - 1),
  });

  await recordQuizGenerationTrace({
    userId: authUser.id,
    quizId,
    quizGoal,
    company: jdCompany ?? undefined,
    skills: normalizedSkills as Array<'SQL' | 'EXCEL' | 'POWERBI'>,
    model: getActiveAiModel(),
    usedFallback,
    patterns: interviewPatterns,
    trace: {
      questionCountRequested: questionCount,
      questionCountGenerated: questions.length,
      includeHandsOn: effectiveIncludeHandsOn,
      generationSource,
      profileType,
      persona,
      difficultyBand: band,
      seenSignatureCount: seenSignatures.size,
      finalUniqueCount: questions.length,
      regenAttempts,
    },
  });

  return {
    success: true,
    quizId,
    questionCount: questions.length,
    questions,
    timerMins,
  };
}
