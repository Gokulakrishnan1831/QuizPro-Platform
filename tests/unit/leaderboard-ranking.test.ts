import { describe, expect, it } from 'vitest';
import { buildLeaderboardEntries, quizMatchesSkill } from '@/lib/leaderboard/ranking';

describe('leaderboard ranking', () => {
  it('matches strict skill from quiz.skill or homogeneous question skills', () => {
    expect(quizMatchesSkill({ skill: 'SQL', questions: [] }, 'SQL')).toBe(true);
    expect(
      quizMatchesSkill({ skill: null, questions: [{ skill: 'SQL' }, { skill: 'SQL' }] }, 'SQL')
    ).toBe(true);
    expect(
      quizMatchesSkill({ skill: null, questions: [{ skill: 'SQL' }, { skill: 'EXCEL' }] }, 'SQL')
    ).toBe(false);
  });

  it('ranks by best score, then accuracy, then quiz count', () => {
    const entries = buildLeaderboardEntries(
      [
        {
          userId: 'u1',
          score: 90,
          answers: [{ isCorrect: true }, { isCorrect: false }],
          completedAt: '2026-01-01',
          quiz: { skill: 'SQL', questions: [] },
        },
        {
          userId: 'u2',
          score: 90,
          answers: [{ isCorrect: true }, { isCorrect: true }],
          completedAt: '2026-01-01',
          quiz: { skill: 'SQL', questions: [] },
        },
        {
          userId: 'u2',
          score: 70,
          answers: [{ isCorrect: true }],
          completedAt: '2026-01-02',
          quiz: { skill: 'SQL', questions: [] },
        },
      ],
      null,
      'SQL',
      10
    );

    expect(entries[0].rank).toBe(1);
    expect(entries[0].quizzes).toBe(2);
    expect(entries[1].rank).toBe(2);
  });
});

