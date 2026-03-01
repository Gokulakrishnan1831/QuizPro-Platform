import { HyperFormula } from 'hyperformula';

export type GridCell = string | number | null;
export type GridMatrix = GridCell[][];

export interface CellCoords {
  row: number;
  col: number;
}

export interface EngineEvaluation {
  values: GridMatrix;
  errors: Record<string, string>;
}

function key(row: number, col: number): string {
  return `${row}-${col}`;
}

function normalizeRawInput(rawValue: string): string | number {
  if (rawValue.trim().startsWith('=')) return rawValue;
  const trimmed = rawValue.trim();
  if (trimmed === '') return '';
  const num = Number(trimmed);
  return Number.isNaN(num) ? rawValue : num;
}

function toEngineMatrix(initialData: GridMatrix): (string | number)[][] {
  return initialData.map((row) =>
    row.map((cell) => (cell === null || cell === undefined ? '' : cell))
  );
}

function normalizeEngineValue(value: unknown): GridCell {
  if (typeof value === 'number' || typeof value === 'string') return value;
  if (value === null || value === undefined) return null;
  return String(value);
}

function formatError(err: { type?: string }): string {
  return err.type ?? 'ERROR';
}

export function evaluateGridWithFormulas(
  initialData: GridMatrix,
  cellInputs: Record<string, string>
): EngineEvaluation {
  const data = toEngineMatrix(initialData);
  const engine = HyperFormula.buildFromSheets(
    { Sheet1: data },
    {
      licenseKey: 'gpl-v3',
      useArrayArithmetic: true,
    }
  );

  const sheetId = engine.getSheetId('Sheet1');
  if (sheetId === undefined) {
    return {
      values: initialData.map((r) => [...r]),
      errors: {},
    };
  }

  for (const [k, raw] of Object.entries(cellInputs)) {
    const [row, col] = k.split('-').map(Number);
    if (!Number.isInteger(row) || !Number.isInteger(col)) continue;
    engine.setCellContents({ sheet: sheetId, row, col }, normalizeRawInput(raw));
  }

  const values: GridMatrix = [];
  const errors: Record<string, string> = {};

  const height = data.length;
  const width = Math.max(0, ...data.map((r) => r.length));
  for (let row = 0; row < height; row++) {
    const outRow: GridCell[] = [];
    for (let col = 0; col < width; col++) {
      const v = engine.getCellValue({ sheet: sheetId, row, col });
      if (v && typeof v === 'object' && 'type' in v) {
        const err = v as { type?: string };
        outRow.push(`#${formatError(err)}`);
        errors[key(row, col)] = formatError(err);
      } else {
        outRow.push(normalizeEngineValue(v));
      }
    }
    values.push(outRow);
  }

  return { values, errors };
}

export function cellRefToCoords(cellRef: string): CellCoords | null {
  const m = /^([A-Z]+)(\d+)$/i.exec(cellRef.trim());
  if (!m) return null;
  const letters = m[1].toUpperCase();
  const row = Number(m[2]) - 1;
  if (row < 0) return null;
  let col = 0;
  for (const ch of letters) {
    col = col * 26 + (ch.charCodeAt(0) - 64);
  }
  return { row, col: col - 1 };
}

export function coordsToCellRef(row: number, col: number): string {
  let n = col + 1;
  let letters = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return `${letters}${row + 1}`;
}

export function normalizeFormula(formula: string): string {
  return formula.replace(/\s+/g, '').toUpperCase();
}

export function formulasMatch(raw: string, expected: string[]): boolean {
  const actual = normalizeFormula(raw);
  return expected.some((v) => normalizeFormula(v) === actual);
}
