import { describe, expect, it } from 'vitest';
import { postProcessQuestions } from '@/lib/ai/post-process';

describe('postProcessQuestions difficulty band', () => {
  it('enforces configured floor and ceiling', () => {
    const questions = [
      { type: 'MCQ', skill: 'SQL', content: 'Q1', options: ['A', 'B', 'C', 'D'], correctAnswer: 'A', difficulty: 2 },
      { type: 'MCQ', skill: 'SQL', content: 'Q2', options: ['A', 'B', 'C', 'D'], correctAnswer: 'A', difficulty: 9 },
    ];

    const out = postProcessQuestions(questions, { difficultyFloor: 6, difficultyCeiling: 8 });
    expect(out[0].difficulty).toBe(6);
    expect(out[1].difficulty).toBe(8);
  });
});
