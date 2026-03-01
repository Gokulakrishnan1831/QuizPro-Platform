/**
 * tests/unit/scoring.test.ts
 *
 * Unit tests for the quiz scoring logic extracted from
 * app/api/quiz/complete/route.ts
 */

import { describe, it, expect } from 'vitest';

/* ─── Utility functions mirrored from the API route ─────────── */

function gradeAnswer(userAnswer: string, correctAnswer: string): boolean {
    return (
        String(userAnswer).trim().toLowerCase() ===
        String(correctAnswer).trim().toLowerCase()
    );
}

function computeScore(totalCorrect: number, totalAnswered: number): number {
    if (totalAnswered === 0) return 0;
    return Number(((totalCorrect / totalAnswered) * 100).toFixed(2));
}

function gradeAnswers(
    answers: { questionIndex: number; userAnswer: string }[],
    questions: { correctAnswer: string; skill: string; content: string; solution: string }[]
) {
    let totalCorrect = 0;
    const gradedAnswers: any[] = [];
    const wrongAnswers: any[] = [];

    for (const ans of answers) {
        const q = questions[ans.questionIndex];
        if (!q) continue;

        const isCorrect = gradeAnswer(ans.userAnswer, q.correctAnswer);
        if (isCorrect) totalCorrect++;

        gradedAnswers.push({
            questionIndex: ans.questionIndex,
            userAnswer: ans.userAnswer,
            isCorrect,
            correctAnswer: q.correctAnswer,
            solution: q.solution,
            skill: q.skill,
            content: q.content,
        });

        if (!isCorrect) {
            wrongAnswers.push({
                questionIndex: ans.questionIndex,
                content: q.content,
                userAnswer: ans.userAnswer,
                correctAnswer: q.correctAnswer,
                explanation: q.solution,
                skill: q.skill,
            });
        }
    }

    return { totalCorrect, gradedAnswers, wrongAnswers };
}

/* ─── Tests ──────────────────────────────────────────────────── */

describe('gradeAnswer()', () => {
    it('returns true for exact match', () => {
        expect(gradeAnswer('WHERE', 'WHERE')).toBe(true);
    });

    it('is case-insensitive', () => {
        expect(gradeAnswer('where', 'WHERE')).toBe(true);
        expect(gradeAnswer('WHERE', 'where')).toBe(true);
    });

    it('trims leading/trailing whitespace', () => {
        expect(gradeAnswer('  WHERE  ', 'WHERE')).toBe(true);
    });

    it('returns false for wrong answer', () => {
        expect(gradeAnswer('HAVING', 'WHERE')).toBe(false);
    });

    it('returns false for empty answer', () => {
        expect(gradeAnswer('', 'WHERE')).toBe(false);
    });

    it('handles numeric answers as strings', () => {
        expect(gradeAnswer('42', '42')).toBe(true);
        expect(gradeAnswer('42', '43')).toBe(false);
    });
});

describe('computeScore()', () => {
    it('returns 0 when no questions answered', () => {
        expect(computeScore(0, 0)).toBe(0);
    });

    it('returns 100 for perfect score', () => {
        expect(computeScore(10, 10)).toBe(100);
    });

    it('returns 50 for half correct', () => {
        expect(computeScore(5, 10)).toBe(50);
    });

    it('rounds to 2 decimal places', () => {
        expect(computeScore(1, 3)).toBe(33.33);
    });

    it('returns 0 when totalCorrect is 0', () => {
        expect(computeScore(0, 10)).toBe(0);
    });
});

describe('gradeAnswers()', () => {
    const questions = [
        {
            correctAnswer: 'WHERE',
            skill: 'SQL',
            content: 'Which clause filters rows?',
            solution: 'WHERE filters rows before GROUP BY.',
        },
        {
            correctAnswer: 'JOIN',
            skill: 'SQL',
            content: 'Which combines tables?',
            solution: 'JOIN combines rows from two or more tables.',
        },
        {
            correctAnswer: 'HAVING',
            skill: 'SQL',
            content: 'Which clause filters groups?',
            solution: 'HAVING filters after GROUP BY.',
        },
    ];

    it('counts correct answers accurately', () => {
        const answers = [
            { questionIndex: 0, userAnswer: 'WHERE' },
            { questionIndex: 1, userAnswer: 'JOIN' },
            { questionIndex: 2, userAnswer: 'WHERE' }, // wrong
        ];
        const { totalCorrect } = gradeAnswers(answers, questions);
        expect(totalCorrect).toBe(2);
    });

    it('correctly separates wrongAnswers', () => {
        const answers = [
            { questionIndex: 0, userAnswer: 'WHERE' }, // correct
            { questionIndex: 1, userAnswer: 'UNION' }, // wrong
        ];
        const { wrongAnswers } = gradeAnswers(answers, questions);
        expect(wrongAnswers).toHaveLength(1);
        expect(wrongAnswers[0].questionIndex).toBe(1);
        expect(wrongAnswers[0].correctAnswer).toBe('JOIN');
    });

    it('skips missing questions gracefully', () => {
        const answers = [{ questionIndex: 99, userAnswer: 'X' }];
        const { gradedAnswers } = gradeAnswers(answers, questions);
        expect(gradedAnswers).toHaveLength(0);
    });

    it('handles all correct case', () => {
        const answers = [
            { questionIndex: 0, userAnswer: 'WHERE' },
            { questionIndex: 1, userAnswer: 'JOIN' },
            { questionIndex: 2, userAnswer: 'HAVING' },
        ];
        const { totalCorrect, wrongAnswers } = gradeAnswers(answers, questions);
        expect(totalCorrect).toBe(3);
        expect(wrongAnswers).toHaveLength(0);
    });

    it('handles all wrong case', () => {
        const answers = [
            { questionIndex: 0, userAnswer: 'X' },
            { questionIndex: 1, userAnswer: 'Y' },
            { questionIndex: 2, userAnswer: 'Z' },
        ];
        const { totalCorrect, wrongAnswers } = gradeAnswers(answers, questions);
        expect(totalCorrect).toBe(0);
        expect(wrongAnswers).toHaveLength(3);
    });

    it('is case-insensitive in full pipeline', () => {
        const answers = [{ questionIndex: 0, userAnswer: 'where' }];
        const { totalCorrect } = gradeAnswers(answers, questions);
        expect(totalCorrect).toBe(1);
    });
});
