'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2,
    RotateCcw,
    FileSpreadsheet,
} from 'lucide-react';
import {
    evaluateGridWithFormulas,
    formulasMatch,
    coordsToCellRef,
} from '@/lib/excel/engine';

export interface ExcelQuestionData {
    type: 'EXCEL_HANDS_ON';
    skill: string;
    content: string;
    columns: string[];
    initialData: (string | number | null)[][];
    editableCells: [number, number][];
    expectedValues: { row: number; col: number; value: string | number }[];
    expectedFormulas?: { row: number; col: number; formulas: string[] }[];
    engineMode?: 'HYPERFORMULA';
    allowEquivalentFormula?: boolean;
    valueTolerance?: number;
    solution: string;
    difficulty: number;
}

export interface ExcelResult {
    isCorrect: boolean;
    userValues: Record<string, { raw: string; value: string | number | null; error?: string | null }>;
    explanation: string;
}

interface ExcelGridProps {
    question: ExcelQuestionData;
    onSubmit: (result: ExcelResult) => void;
    result: ExcelResult | null;
    disabled: boolean;
}

function colLetter(index: number): string {
    return coordsToCellRef(0, index).replace('1', '');
}

export default function ExcelGrid({
    question,
    onSubmit,
    result,
    disabled,
}: ExcelGridProps) {
    const safeInitialData = question.initialData ?? [[]];
    const safeEditableCells = question.editableCells ?? [];
    const safeColumns = question.columns ?? [];
    const safeExpectedValues = question.expectedValues ?? [];
    const safeExpectedFormulas = question.expectedFormulas ?? [];

    const [activeCell, setActiveCell] = useState<[number, number] | null>(null);
    const [editingCell, setEditingCell] = useState<[number, number] | null>(null);
    const [formulaBar, setFormulaBar] = useState('');
    const [cellInputs, setCellInputs] = useState<Record<string, string>>({});
    const [cellErrors, setCellErrors] = useState<Record<string, string>>({});

    const { computedGrid, computedErrors } = useMemo(() => {
        const evaluated = evaluateGridWithFormulas(safeInitialData, cellInputs);
        return {
            computedGrid: evaluated.values,
            computedErrors: evaluated.errors,
        };
    }, [safeInitialData, cellInputs]);

    const editableSet = useMemo(
        () => new Set(safeEditableCells.map(([r, c]) => `${r}-${c}`)),
        [safeEditableCells]
    );

    const expectedFormulaMap = useMemo(() => {
        const map = new Map<string, string[]>();
        for (const item of safeExpectedFormulas) {
            map.set(`${item.row}-${item.col}`, item.formulas ?? []);
        }
        return map;
    }, [safeExpectedFormulas]);

    const expectedValueMap = useMemo(() => {
        const map = new Map<string, string | number>();
        for (const item of safeExpectedValues) {
            map.set(`${item.row}-${item.col}`, item.value);
        }
        return map;
    }, [safeExpectedValues]);

    const isEditable = useCallback((row: number, col: number) => {
        return editableSet.has(`${row}-${col}`);
    }, [editableSet]);

    const setCellRawValue = useCallback((row: number, col: number, rawValue: string) => {
        const key = `${row}-${col}`;
        setCellInputs((prev) => ({ ...prev, [key]: rawValue }));
    }, []);

    const handleCellClick = (row: number, col: number) => {
        if (!isEditable(row, col) || disabled) return;
        setActiveCell([row, col]);
        setEditingCell([row, col]);
        const key = `${row}-${col}`;
        const raw = cellInputs[key] ?? '';
        setFormulaBar(raw);
    };

    const handleFormulaChange = (value: string) => {
        setFormulaBar(value);
        if (!activeCell) return;
        const [row, col] = activeCell;
        setCellRawValue(row, col, value);
    };

    const handleReset = () => {
        setCellInputs({});
        setCellErrors({});
        setActiveCell(null);
        setEditingCell(null);
        setFormulaBar('');
    };

    const compareValues = (actual: string | number | null | undefined, expected: string | number): boolean => {
        const actualNorm = String(actual ?? '').trim().toLowerCase();
        const expectedNorm = String(expected ?? '').trim().toLowerCase();
        const actualNum = parseFloat(actualNorm);
        const expectedNum = parseFloat(expectedNorm);
        const tolerance = question.valueTolerance ?? 0.01;
        if (!Number.isNaN(actualNum) && !Number.isNaN(expectedNum)) {
            return Math.abs(actualNum - expectedNum) <= tolerance;
        }
        return actualNorm === expectedNorm;
    };

    const handleSubmit = () => {
        const targetCells = safeEditableCells.length > 0
            ? safeEditableCells
            : Array.from(
                new Set([
                    ...Array.from(expectedFormulaMap.keys()),
                    ...Array.from(expectedValueMap.keys()),
                ])
            ).map((k) => k.split('-').map(Number) as [number, number]);

        let allCorrect = true;
        const userValues: Record<string, { raw: string; value: string | number | null; error?: string | null }> = {};
        const submitErrors: Record<string, string> = {};

        for (const [row, col] of targetCells) {
            const key = `${row}-${col}`;
            const cellRef = coordsToCellRef(row, col);
            const raw = (cellInputs[key] ?? '').trim();
            const currentValue = computedGrid[row]?.[col] ?? null;
            userValues[cellRef] = {
                raw,
                value: currentValue,
                error: computedErrors[key] ?? cellErrors[key] ?? null,
            };

            const expectedFormulas = expectedFormulaMap.get(key) ?? [];
            if (computedErrors[key]) {
                allCorrect = false;
                submitErrors[key] = computedErrors[key];
                continue;
            }
            if (expectedFormulas.length > 0) {
                if (!raw.startsWith('=') || !formulasMatch(raw, expectedFormulas)) {
                    allCorrect = false;
                    submitErrors[key] = 'Formula does not match expected pattern.';
                    continue;
                }
            }

            if (expectedValueMap.has(key)) {
                const expectedValue = expectedValueMap.get(key)!;
                const evaluated = currentValue;
                if (!compareValues(evaluated, expectedValue)) {
                    allCorrect = false;
                    submitErrors[key] = `Expected ${expectedValue}, got ${evaluated ?? ''}`;
                }
            }
        }

        setCellErrors((prev) => ({ ...prev, ...submitErrors }));
        onSubmit({
            isCorrect: allCorrect,
            userValues,
            explanation: question.solution,
        });
    };

    return (
        <div>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem',
                }}
            >
                <span
                    style={{
                        padding: '4px 14px',
                        borderRadius: '20px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        color: '#10b981',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                    }}
                >
                    <FileSpreadsheet size={12} /> Excel Hands-On
                </span>
                <span
                    style={{
                        padding: '4px 12px',
                        borderRadius: '20px',
                        background: 'var(--subtle-bg)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.7rem',
                        color: 'var(--text-muted)',
                    }}
                >
                    Difficulty {question.difficulty}/10
                </span>
            </div>

            <h2
                style={{
                    fontSize: '1.2rem',
                    fontWeight: '600',
                    lineHeight: '1.6',
                    color: 'var(--text-primary)',
                    marginBottom: '1.5rem',
                }}
            >
                {question.content}
            </h2>


            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '2px',
                    padding: '6px 12px',
                    background: 'var(--subtle-bg)',
                    borderRadius: '8px 8px 0 0',
                    border: '1px solid var(--border-color)',
                    borderBottom: 'none',
                }}
            >
                <span
                    style={{
                        color: 'var(--text-muted)',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        minWidth: '30px',
                    }}
                >
                    {activeCell ? `${colLetter(activeCell[1])}${activeCell[0] + 1}` : 'fx'}
                </span>
                <input
                    type="text"
                    value={formulaBar}
                    onChange={(e) => handleFormulaChange(e.target.value)}
                    disabled={!activeCell || disabled}
                    placeholder="Select an editable cell and type formula"
                    style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        outline: 'none',
                        fontSize: '0.85rem',
                        fontFamily: 'monospace',
                    }}
                />
                <button
                    onClick={handleReset}
                    disabled={disabled}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--background)',
                        color: 'var(--text-primary)',
                        cursor: disabled ? 'default' : 'pointer',
                        fontSize: '0.7rem',
                    }}
                >
                    <RotateCcw size={11} /> Reset
                </button>
            </div>

            <div
                style={{
                    borderRadius: '0 0 12px 12px',
                    overflow: 'hidden',
                    border: '1px solid var(--border-color)',
                    marginBottom: '1.5rem',
                }}
            >
                <div style={{ overflowX: 'auto' }}>
                    <table
                        style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: '0.85rem',
                            fontFamily: 'monospace',
                        }}
                    >
                        <thead>
                            <tr>
                                <th
                                    style={{
                                        padding: '8px 12px',
                                        background: 'var(--subtle-bg)',
                                        borderRight: '1px solid var(--border-color)',
                                        borderBottom: '1px solid var(--border-color)',
                                        color: 'var(--text-muted)',
                                        fontWeight: '600',
                                        fontSize: '0.7rem',
                                        textAlign: 'center',
                                        width: '40px',
                                    }}
                                >
                                    #
                                </th>
                                {safeColumns.map((col, ci) => (
                                    <th
                                        key={ci}
                                        style={{
                                            padding: '8px 16px',
                                            background: 'var(--subtle-bg)',
                                            borderRight: '1px solid var(--border-color)',
                                            borderBottom: '1px solid var(--border-color)',
                                            color: 'var(--primary)',
                                            fontWeight: '700',
                                            fontSize: '0.75rem',
                                            textAlign: 'left',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                        }}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>
                                                {colLetter(ci)}
                                            </span>
                                            {col}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {computedGrid.map((row, ri) => (
                                <tr key={ri}>
                                    <td
                                        style={{
                                            padding: '6px 12px',
                                            background: 'var(--subtle-bg)',
                                            borderRight: '1px solid var(--border-color)',
                                            borderBottom: '1px solid var(--border-color)',
                                            color: 'var(--text-muted)',
                                            fontWeight: '600',
                                            fontSize: '0.7rem',
                                            textAlign: 'center',
                                        }}
                                    >
                                        {ri + 1}
                                    </td>
                                    {row.map((cell, ci) => {
                                        const editable = isEditable(ri, ci);
                                        const isActive = activeCell?.[0] === ri && activeCell?.[1] === ci;
                                        const isEditing = editingCell?.[0] === ri && editingCell?.[1] === ci;
                                        const key = `${ri}-${ci}`;
                                        const raw = cellInputs[key] ?? '';
                                        const error = cellErrors[key] ?? computedErrors[key];
                                        const displayValue = (cell === null || cell === undefined) ? '' : String(cell);

                                        return (
                                            <td
                                                key={ci}
                                                onClick={() => handleCellClick(ri, ci)}
                                                style={{
                                                    padding: '6px 16px',
                                                    borderRight: '1px solid var(--border-color)',
                                                    borderBottom: '1px solid var(--border-color)',
                                                    color: editable ? 'var(--text-primary)' : 'var(--text-muted)',
                                                    cursor: editable && !disabled ? 'pointer' : 'default',
                                                    background: isActive
                                                        ? 'rgba(99, 102, 241, 0.12)'
                                                        : editable
                                                            ? 'rgba(99, 102, 241, 0.04)'
                                                            : 'transparent',
                                                    outline: error
                                                        ? '2px solid #ef4444'
                                                        : isActive
                                                            ? '2px solid var(--primary)'
                                                            : 'none',
                                                    outlineOffset: '-2px',
                                                    minWidth: '120px',
                                                }}
                                                title={error || undefined}
                                            >
                                                {editable ? (
                                                    isEditing ? (
                                                        <input
                                                            value={raw}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onFocus={() => {
                                                                setActiveCell([ri, ci]);
                                                                setEditingCell([ri, ci]);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    setEditingCell(null);
                                                                    (e.currentTarget as HTMLInputElement).blur();
                                                                }
                                                                if (e.key === 'Escape') {
                                                                    e.preventDefault();
                                                                    setEditingCell(null);
                                                                    (e.currentTarget as HTMLInputElement).blur();
                                                                }
                                                            }}
                                                            onChange={(e) => {
                                                                const next = e.target.value;
                                                                setFormulaBar(next);
                                                                setCellRawValue(ri, ci, next);
                                                            }}
                                                            onBlur={() => {
                                                                setEditingCell(null);
                                                                setCellErrors((prev) => {
                                                                    const next = { ...prev };
                                                                    delete next[key];
                                                                    return next;
                                                                });
                                                            }}
                                                            disabled={disabled}
                                                            placeholder="=FORMULA()"
                                                            style={{
                                                                width: '100%',
                                                                background: 'transparent',
                                                                border: 'none',
                                                                outline: 'none',
                                                                color: 'var(--text-primary)',
                                                                fontFamily: 'monospace',
                                                                fontSize: '0.82rem',
                                                            }}
                                                        />
                                                    ) : (
                                                        <span
                                                            onDoubleClick={() => {
                                                                if (!disabled) {
                                                                    setActiveCell([ri, ci]);
                                                                    setEditingCell([ri, ci]);
                                                                }
                                                            }}
                                                        >
                                                            {displayValue}
                                                        </span>
                                                    )
                                                ) : (
                                                    displayValue
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {!result && (
                <motion.button
                    whileHover={{ scale: disabled ? 1 : 1.02 }}
                    whileTap={{ scale: disabled ? 1 : 0.98 }}
                    onClick={handleSubmit}
                    disabled={disabled}
                    className="btn-primary"
                    style={{
                        width: '100%',
                        justifyContent: 'center',
                        padding: '14px',
                        opacity: disabled ? 0.5 : 1,
                        marginTop: '1.5rem',
                    }}
                >
                    <CheckCircle2 size={18} />
                    Submit Answer
                </motion.button>
            )}
        </div>
    );
}
