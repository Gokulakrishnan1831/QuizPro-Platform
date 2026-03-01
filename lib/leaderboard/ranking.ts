export type SkillFilter = 'SQL' | 'EXCEL' | 'POWERBI' | 'ALL';

export interface LeaderboardEntry {
  rank: number;
  label: string;
  score: number;
  quizzes: number;
  accuracy: number;
  isCurrentUser: boolean;
}

interface AttemptLike {
  userId?: string;
  score?: unknown;
  answers?: unknown;
  completedAt?: string | Date | null;
  quiz?: {
    skill?: string | null;
    questions?: unknown;
  } | null;
}

function hashId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash % 9000) + 1000;
}

function parseAnswerStats(answers: unknown): { correct: number; total: number } {
  if (!Array.isArray(answers)) return { correct: 0, total: 0 };
  let total = 0;
  let correct = 0;
  for (const ans of answers) {
    if (!ans || typeof ans !== 'object') continue;
    total++;
    if ((ans as any).isCorrect === true) correct++;
  }
  return { correct, total };
}

export function quizMatchesSkill(quiz: AttemptLike['quiz'], skill: SkillFilter): boolean {
  if (!quiz) return false;
  if (skill === 'ALL') return true;
  const quizSkill = String(quiz.skill ?? '').toUpperCase();
  if (quizSkill === skill) return true;
  if (quizSkill && quizSkill !== skill) return false;

  if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) return false;
  const normalized = quiz.questions
    .map((q: any) => String(q?.skill ?? '').toUpperCase())
    .filter((s: string) => s.length > 0);
  if (normalized.length === 0) return false;
  return normalized.every((s: string) => s === skill);
}

export function buildLeaderboardEntries(
  attempts: AttemptLike[],
  currentUserId: string | null,
  skill: SkillFilter,
  limit: number
): LeaderboardEntry[] {
  const perUser = new Map<
    string,
    { bestScore: number; quizCount: number; totalCorrect: number; totalAnswered: number; lastCompletedAt: number }
  >();

  for (const attempt of attempts) {
    const userId = String(attempt.userId ?? '');
    if (!userId) continue;
    if (!quizMatchesSkill(attempt.quiz, skill)) continue;

    const score = Number(attempt.score ?? 0);
    const { correct, total } = parseAnswerStats(attempt.answers);
    const completedAt = attempt.completedAt ? new Date(attempt.completedAt).getTime() : 0;

    const prev = perUser.get(userId);
    if (!prev) {
      perUser.set(userId, {
        bestScore: Number.isFinite(score) ? score : 0,
        quizCount: 1,
        totalCorrect: correct,
        totalAnswered: total,
        lastCompletedAt: completedAt,
      });
      continue;
    }

    prev.bestScore = Math.max(prev.bestScore, Number.isFinite(score) ? score : 0);
    prev.quizCount += 1;
    prev.totalCorrect += correct;
    prev.totalAnswered += total;
    prev.lastCompletedAt = Math.max(prev.lastCompletedAt, completedAt);
  }

  const rows = Array.from(perUser.entries()).map(([userId, s]) => {
    const accuracy = s.totalAnswered > 0 ? (s.totalCorrect / s.totalAnswered) * 100 : 0;
    return { userId, ...s, accuracy };
  });

  rows.sort((a, b) => {
    if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
    if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
    if (b.quizCount !== a.quizCount) return b.quizCount - a.quizCount;
    if (b.lastCompletedAt !== a.lastCompletedAt) return b.lastCompletedAt - a.lastCompletedAt;
    return a.userId.localeCompare(b.userId);
  });

  return rows.slice(0, limit).map((row, i) => ({
    rank: i + 1,
    label: row.userId === currentUserId ? 'You' : `Analyst #${hashId(row.userId)}`,
    score: Math.round(row.bestScore),
    quizzes: row.quizCount,
    accuracy: Math.round(row.accuracy),
    isCurrentUser: row.userId === currentUserId,
  }));
}

