import { describe, expect, it } from 'vitest';
import {
  evaluateGridWithFormulas,
  cellRefToCoords,
  coordsToCellRef,
  formulasMatch,
} from '@/lib/excel/engine';

describe('excel engine adapter', () => {
  it('evaluates formulas and returns computed values', () => {
    const initialData = [
      ['Alice', 10, 20, null],
      ['Bob', 5, 15, null],
      ['Total', null, null, null],
    ];

    const { values, errors } = evaluateGridWithFormulas(initialData, {
      '0-3': '=B1+C1',
      '1-3': '=B2+C2',
      '2-3': '=SUM(D1:D2)',
    });

    expect(errors['0-3']).toBeUndefined();
    expect(values[0][3]).toBe(30);
    expect(values[1][3]).toBe(20);
    expect(values[2][3]).toBe(50);
  });

  it('handles cell reference conversions', () => {
    expect(coordsToCellRef(0, 0)).toBe('A1');
    expect(coordsToCellRef(4, 27)).toBe('AB5');
    expect(cellRefToCoords('AB5')).toEqual({ row: 4, col: 27 });
  });

  it('normalizes formulas for matching', () => {
    expect(formulasMatch(' =sum( A1 : A3 ) ', ['=SUM(A1:A3)'])).toBe(true);
  });
});

