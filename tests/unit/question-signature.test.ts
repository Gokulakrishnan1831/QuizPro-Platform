import { describe, expect, it } from 'vitest';
import { buildQuestionSignature, uniqueBySignature } from '@/lib/quiz/question-signature';

describe('question signature', () => {
  it('produces same signature for formatting-only differences', () => {
    const a = {
      type: 'MCQ',
      skill: 'SQL',
      content: ' What does GROUP BY do? ',
      options: ['Groups Rows', 'Sorts Rows', 'Deletes Rows', 'Updates Rows'],
      correctAnswer: 'Groups Rows',
      difficulty: 6,
    };
    const b = {
      type: 'mcq',
      skill: 'sql',
      content: 'what does   group by do?',
      options: ['groups rows', 'sorts rows', 'deletes rows', 'updates rows'],
      correctAnswer: 'groups rows',
      difficulty: 6,
    };
    expect(buildQuestionSignature(a)).toBe(buildQuestionSignature(b));
  });

  it('produces same signature when MCQ difficulty and option order change', () => {
    const a = {
      type: 'MCQ',
      skill: 'SQL',
      content: 'Which clause filters rows before grouping?',
      options: ['WHERE', 'HAVING', 'GROUP BY', 'ORDER BY'],
      correctAnswer: 'WHERE',
      difficulty: 5,
    };
    const b = {
      type: 'MCQ',
      skill: 'SQL',
      content: 'Which clause filters rows before grouping?',
      options: ['ORDER BY', 'GROUP BY', 'WHERE', 'HAVING'],
      correctAnswer: 'WHERE',
      difficulty: 8,
    };
    expect(buildQuestionSignature(a)).toBe(buildQuestionSignature(b));
  });

  it('deduplicates a mixed list by signature', () => {
    const q1 = {
      type: 'MCQ',
      skill: 'EXCEL',
      content: 'What is XLOOKUP?',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A',
      difficulty: 7,
    };
    const q2 = {
      type: 'MCQ',
      skill: 'EXCEL',
      content: 'What is xlookup? ',
      options: ['a', 'b', 'c', 'd'],
      correctAnswer: 'a',
      difficulty: 7,
    };
    const q3 = { ...q1, content: 'What is INDEX MATCH?' };
    expect(uniqueBySignature([q1, q2, q3]).length).toBe(2);
  });

  it('deduplicates equivalent MCQs with reordered options', () => {
    const q1 = {
      type: 'MCQ',
      skill: 'POWERBI',
      content: 'What does CALCULATE do in DAX?',
      options: [
        'Evaluates an expression in a modified filter context',
        'Creates a relationship',
        'Refreshes a dataset',
        'Builds a visual',
      ],
      correctAnswer: 'Evaluates an expression in a modified filter context',
      difficulty: 6,
    };
    const q2 = {
      ...q1,
      options: [
        'Builds a visual',
        'Creates a relationship',
        'Evaluates an expression in a modified filter context',
        'Refreshes a dataset',
      ],
      difficulty: 4,
    };

    expect(uniqueBySignature([q1, q2])).toHaveLength(1);
  });
});
