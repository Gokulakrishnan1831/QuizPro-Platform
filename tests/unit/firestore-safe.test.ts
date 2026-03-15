import { describe, expect, it } from 'vitest';
import { decodeFirestoreSafeDocument, encodeFirestoreSafeDocument } from '@/lib/firebase/firestore-safe';

describe('firestore-safe helpers', () => {
  it('encodes nested arrays in quiz question payloads and restores them on decode', () => {
    const original = {
      questions: [
        {
          type: 'EXCEL_HANDS_ON',
          columns: ['Name', 'Value', 'Result'],
          initialData: [
            ['Alice', 10, null],
            ['Bob', 20, null],
          ],
          editableCells: [[0, 2], [1, 2]],
          expectedFormulas: [
            { row: 0, col: 2, formulas: ['=B1*2'] },
          ],
          expectedValues: [
            { row: 0, col: 2, value: 20 },
          ],
        },
      ],
    };

    const encoded = encodeFirestoreSafeDocument(original);
    const question = encoded.questions[0];

    expect(question.initialData).toEqual([
      { quizproArray: ['Alice', 10, null] },
      { quizproArray: ['Bob', 20, null] },
    ]);
    expect(question.editableCells).toEqual([
      { quizproArray: [0, 2] },
      { quizproArray: [1, 2] },
    ]);
    expect(question.expectedFormulas).toEqual([
      { row: 0, col: 2, formulas: ['=B1*2'] },
    ]);

    expect(decodeFirestoreSafeDocument(encoded)).toEqual(original);
  });
});
