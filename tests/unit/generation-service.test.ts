import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateQuizForUser } from '@/lib/quiz/generation-service';
import { buildQuestionSignature } from '@/lib/quiz/question-signature';

const mocks = vi.hoisted(() => ({
  groqQuizCompletion: vi.fn(),
  getActiveAiModel: vi.fn(),
  createQuiz: vi.fn(),
  updateUser: vi.fn(),
  getRecentQuestionHistory: vi.fn(),
  createQuestionHistoryBatch: vi.fn(),
  getQuestionsByFilter: vi.fn(),
  getCachedInterviewQuestions: vi.fn(),
  incrementServedCount: vi.fn(),
  cacheInterviewQuestions: vi.fn(),
  researchAndGenerateQuestions: vi.fn(),
  fetchCompanyInterviewPatterns: vi.fn(),
  buildInterviewGroundingContext: vi.fn(),
  recordQuizGenerationTrace: vi.fn(),
  getRandomSeedQuestions: vi.fn(),
}));

vi.mock('@/lib/ai/groq-client', () => ({
  groqQuizCompletion: mocks.groqQuizCompletion,
  getActiveAiModel: mocks.getActiveAiModel,
}));

vi.mock('@/lib/firebase/db', () => ({
  createQuiz: mocks.createQuiz,
  updateUser: mocks.updateUser,
  getRecentQuestionHistory: mocks.getRecentQuestionHistory,
  createQuestionHistoryBatch: mocks.createQuestionHistoryBatch,
  getQuestionsByFilter: mocks.getQuestionsByFilter,
}));

vi.mock('@/lib/interview/question-cache', () => ({
  getCachedInterviewQuestions: mocks.getCachedInterviewQuestions,
  incrementServedCount: mocks.incrementServedCount,
  cacheInterviewQuestions: mocks.cacheInterviewQuestions,
}));

vi.mock('@/lib/interview/research-agent', () => ({
  researchAndGenerateQuestions: mocks.researchAndGenerateQuestions,
}));

vi.mock('@/lib/interview/retrieval', () => ({
  fetchCompanyInterviewPatterns: mocks.fetchCompanyInterviewPatterns,
  buildInterviewGroundingContext: mocks.buildInterviewGroundingContext,
  recordQuizGenerationTrace: mocks.recordQuizGenerationTrace,
}));

vi.mock('@/lib/ai/seed-questions', () => ({
  getRandomSeedQuestions: mocks.getRandomSeedQuestions,
}));

function makeMcq(content: string, difficulty: number) {
  return {
    type: 'MCQ',
    skill: 'SQL',
    content,
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 'A',
    solution: 'sol',
    difficulty,
  };
}

function makeMcqVariant(content: string, difficulty: number) {
  return {
    type: 'MCQ',
    skill: 'SQL',
    content,
    options: ['D', 'C', 'A', 'B'],
    correctAnswer: 'A',
    solution: 'sol',
    difficulty,
  };
}

describe('generation-service integration behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getActiveAiModel.mockReturnValue('gpt-5.3');
    mocks.createQuiz.mockResolvedValue('quiz_1');
    mocks.updateUser.mockResolvedValue(undefined);
    mocks.createQuestionHistoryBatch.mockResolvedValue(0);
    mocks.getQuestionsByFilter.mockResolvedValue([]);
    mocks.getCachedInterviewQuestions.mockResolvedValue({
      questions: [],
      cacheHit: false,
      partialHit: false,
      cached: 0,
      company: '',
      role: '',
    });
    mocks.incrementServedCount.mockResolvedValue(undefined);
    mocks.cacheInterviewQuestions.mockResolvedValue(0);
    mocks.researchAndGenerateQuestions.mockResolvedValue([]);
    mocks.fetchCompanyInterviewPatterns.mockResolvedValue([]);
    mocks.buildInterviewGroundingContext.mockReturnValue('');
    mocks.recordQuizGenerationTrace.mockResolvedValue(undefined);
    mocks.getRandomSeedQuestions.mockReturnValue([]);
  });

  it('filters previously seen signatures and refills with new questions', async () => {
    const seenQuestion = makeMcq('Seen SQL question', 6);
    const newQuestion1 = makeMcq('New SQL question 1', 6);
    const newQuestion2 = makeMcq('New SQL question 2', 6);
    const seenSignature = buildQuestionSignature(seenQuestion);

    mocks.getRecentQuestionHistory.mockResolvedValue([
      {
        id: 'h1',
        userId: 'u1',
        skill: 'SQL',
        quizGoal: 'PRACTICE',
        profileType: 'FRESHER',
        questionSignature: seenSignature,
      },
    ]);

    mocks.groqQuizCompletion
      .mockResolvedValueOnce(JSON.stringify([seenQuestion, newQuestion1]))
      .mockResolvedValueOnce(JSON.stringify([newQuestion2]));

    const result = await generateQuizForUser(
      {
        id: 'u1',
        profileType: 'FRESHER',
        quizzesRemaining: 5,
        toolStack: ['SQL'],
        quizGoal: 'PRACTICE',
      },
      {
        skills: ['SQL'],
        questionCount: 2,
        quizGoal: 'PRACTICE',
      },
    );

    expect(result.success).toBe(true);
    expect(result.questions?.length).toBe(2);
    const signatures = (result.questions ?? []).map((q) => buildQuestionSignature(q));
    expect(signatures).not.toContain(seenSignature);
    expect(mocks.createQuestionHistoryBatch).toHaveBeenCalledTimes(1);
    expect(mocks.createQuestionHistoryBatch.mock.calls[0][0]).toHaveLength(2);
  });

  it('treats reordered options and difficulty changes as the same seen MCQ', async () => {
    const seenQuestion = makeMcq('Seen SQL question', 6);
    const regeneratedVariant = makeMcqVariant('Seen SQL question', 8);
    const newQuestion = makeMcq('Fresh SQL question', 6);
    const seenSignature = buildQuestionSignature(seenQuestion);

    mocks.getRecentQuestionHistory.mockResolvedValue([
      {
        id: 'h1',
        userId: 'u1',
        skill: 'SQL',
        quizGoal: 'PRACTICE',
        profileType: 'FRESHER',
        questionSignature: seenSignature,
      },
    ]);

    mocks.groqQuizCompletion
      .mockResolvedValueOnce(JSON.stringify([regeneratedVariant]))
      .mockResolvedValueOnce(JSON.stringify([newQuestion]));

    const result = await generateQuizForUser(
      {
        id: 'u1',
        profileType: 'FRESHER',
        quizzesRemaining: 5,
        toolStack: ['SQL'],
        quizGoal: 'PRACTICE',
      },
      {
        skills: ['SQL'],
        questionCount: 1,
        quizGoal: 'PRACTICE',
      },
    );

    expect(result.success).toBe(true);
    expect(result.questions).toHaveLength(1);
    expect(result.questions?.[0]?.content).toBe('Fresh SQL question');
  });

  it('prevents repeats for the same user across quiz goals', async () => {
    const seenQuestion = makeMcq('Shared SQL question', 6);
    const replacementQuestion = makeMcq('Interview-safe SQL question', 7);
    const seenSignature = buildQuestionSignature(seenQuestion);

    mocks.getRecentQuestionHistory.mockResolvedValue([
      {
        id: 'h1',
        userId: 'u3',
        skill: 'SQL',
        quizGoal: 'PRACTICE',
        profileType: 'FRESHER',
        questionSignature: seenSignature,
      },
    ]);

    mocks.groqQuizCompletion
      .mockResolvedValueOnce(JSON.stringify([seenQuestion]))
      .mockResolvedValueOnce(JSON.stringify([replacementQuestion]));

    const result = await generateQuizForUser(
      {
        id: 'u3',
        profileType: 'FRESHER',
        quizzesRemaining: 5,
        toolStack: ['SQL'],
        quizGoal: 'INTERVIEW_PREP',
        upcomingCompany: 'Acme',
        upcomingJD: 'SQL analytics role',
      },
      {
        skills: ['SQL'],
        questionCount: 1,
        quizGoal: 'INTERVIEW_PREP',
        jdCompany: 'Acme',
        jdText: 'SQL analytics role',
      },
    );

    expect(result.success).toBe(true);
    expect(result.questions).toHaveLength(1);
    expect(result.questions?.[0]?.content).toBe('Interview-safe SQL question');
    expect(mocks.getRecentQuestionHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u3',
        sinceDays: 90,
        skills: ['SQL'],
      }),
    );
    expect(mocks.getRecentQuestionHistory.mock.calls[0][0]).not.toHaveProperty('quizGoal');
  });

  it('prevents repeats for the same user across profile types', async () => {
    const seenQuestion = makeMcq('Career-switch SQL question', 6);
    const replacementQuestion = makeMcq('Experienced-only SQL question', 8);
    const seenSignature = buildQuestionSignature(seenQuestion);

    mocks.getRecentQuestionHistory.mockResolvedValue([
      {
        id: 'h1',
        userId: 'u4',
        skill: 'SQL',
        quizGoal: 'INTERVIEW_PREP',
        profileType: 'FRESHER',
        questionSignature: seenSignature,
      },
    ]);

    mocks.groqQuizCompletion
      .mockResolvedValueOnce(JSON.stringify([seenQuestion]))
      .mockResolvedValueOnce(JSON.stringify([replacementQuestion]));

    const result = await generateQuizForUser(
      {
        id: 'u4',
        profileType: 'EXPERIENCED',
        quizzesRemaining: 5,
        toolStack: ['SQL'],
        quizGoal: 'PRACTICE',
      },
      {
        skills: ['SQL'],
        questionCount: 1,
        quizGoal: 'PRACTICE',
      },
    );

    expect(result.success).toBe(true);
    expect(result.questions).toHaveLength(1);
    expect(result.questions?.[0]?.content).toBe('Experienced-only SQL question');
    expect(mocks.getRecentQuestionHistory.mock.calls[0][0]).not.toHaveProperty('profileType');
  });

  it.each([
    ['FRESHER', 'PRACTICE', 5, 7],
    ['FRESHER', 'INTERVIEW_PREP', 6, 8],
    ['EXPERIENCED', 'PRACTICE', 6, 8],
    ['EXPERIENCED', 'INTERVIEW_PREP', 7, 9],
  ] as const)(
    'enforces difficulty band for %s + %s',
    async (profileType, quizGoal, floor, ceiling) => {
      mocks.getRecentQuestionHistory.mockResolvedValue([]);
      mocks.groqQuizCompletion.mockResolvedValueOnce(
        JSON.stringify([makeMcq('Band test question', 1)]),
      );

      const result = await generateQuizForUser(
        {
          id: 'u2',
          profileType,
          quizzesRemaining: 5,
          toolStack: ['SQL'],
          quizGoal,
          upcomingCompany: quizGoal === 'INTERVIEW_PREP' ? 'Acme' : null,
          upcomingJD: quizGoal === 'INTERVIEW_PREP' ? 'SQL analytics role' : null,
        },
        {
          skills: ['SQL'],
          questionCount: 1,
          quizGoal,
          jdCompany: quizGoal === 'INTERVIEW_PREP' ? 'Acme' : undefined,
          jdText: quizGoal === 'INTERVIEW_PREP' ? 'SQL analytics role' : undefined,
        },
      );

      expect(result.success).toBe(true);
      const difficulty = Number(result.questions?.[0]?.difficulty);
      expect(difficulty).toBeGreaterThanOrEqual(floor);
      expect(difficulty).toBeLessThanOrEqual(ceiling);
    },
  );
});
