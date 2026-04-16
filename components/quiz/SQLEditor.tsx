'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Play,
    Loader2,
    Database,
    CheckCircle2,
    XCircle,
    RotateCcw,
    Terminal,
    Table2,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import Monaco to avoid SSR issues
const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

/* ─── Types ─────────────────────────────────────────────────── */

export interface SQLQuestionData {
    type: 'SQL_HANDS_ON';
    skill: string;
    content: string;
    setupSQL: string; // CREATE TABLE + INSERT statements
    sampleData?: { tableName: string; rows: Record<string, any>[] }[];
    expectedOutput: Record<string, any>[];
    expectedColumns?: string[];
    solution: string; // correct SQL query
    starterCode?: string;
    difficulty: number;
}

export interface SQLResult {
    isCorrect: boolean;
    userQuery: string;
    explanation: string;
}

interface SQLEditorProps {
    question: SQLQuestionData;
    onSubmit: (result: SQLResult) => void;
    result: SQLResult | null;
    disabled: boolean;
}

/* ─── Normalise result for comparison ───────────────────────── */

function normalizeValue(val: any): string {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return String(val);
    if (typeof val === 'bigint') return String(val);
    return String(val).trim().toLowerCase();
}

function compareResults(
    actual: Record<string, any>[],
    expected: Record<string, any>[],
    expectedColumns?: string[]
): { match: boolean; message: string } {
    if (actual.length !== expected.length) {
        return {
            match: false,
            message: `Row count mismatch: got ${actual.length} rows, expected ${expected.length}`,
        };
    }

    if (actual.length === 0 && expected.length === 0) {
        return { match: true, message: 'Both results are empty — correct!' };
    }

    const actualCols = Object.keys(actual[0] ?? {}).map((c) => c.toLowerCase());
    const expectedCols = expectedColumns
        ? expectedColumns.map((c) => c.toLowerCase())
        : Object.keys(expected[0] ?? {}).map((c) => c.toLowerCase());

    // Compare row values by column name (order-insensitive)
    const serializeByName = (row: Record<string, any>, cols: string[]) =>
        cols
            .map((c) => {
                const key = Object.keys(row).find((k) => k.toLowerCase() === c);
                return normalizeValue(key ? row[key] : null);
            })
            .join('|');

    // Try matching by column name first
    const colsMissing = expectedCols.filter((c) => !actualCols.includes(c));
    if (colsMissing.length === 0) {
        const expectedSet = new Set(expected.map((r) => serializeByName(r, expectedCols)));
        const actualSerialized = actual.map((r) => serializeByName(r, expectedCols));
        const missing = actualSerialized.filter((s) => !expectedSet.has(s));

        if (missing.length === 0) {
            return { match: true, message: 'Output matches expected result!' };
        }

        return {
            match: false,
            message: `${missing.length} row(s) don't match expected output`,
        };
    }

    // Fallback: column names differ (e.g. avg(score) vs average_score)
    // Compare by values only if same number of columns
    if (actualCols.length !== expectedCols.length) {
        return {
            match: false,
            message: `Column count mismatch: got ${actualCols.length}, expected ${expectedCols.length}`,
        };
    }

    const serializeByPosition = (row: Record<string, any>) =>
        Object.values(row).map((v) => normalizeValue(v)).sort().join('|');

    const expectedSetByPos = new Set(expected.map((r) => serializeByPosition(r)));
    const actualByPos = actual.map((r) => serializeByPosition(r));
    const missingByPos = actualByPos.filter((s) => !expectedSetByPos.has(s));

    if (missingByPos.length > 0) {
        return {
            match: false,
            message: `${missingByPos.length} row(s) don't match expected output`,
        };
    }

    return { match: true, message: 'Output matches expected result!' };
}

/* ─── Component ─────────────────────────────────────────────── */

export default function SQLEditor({
    question,
    onSubmit,
    result,
    disabled,
}: SQLEditorProps) {
    const [db, setDb] = useState<any>(null);
    const [conn, setConn] = useState<any>(null);
    const [query, setQuery] = useState(question.starterCode ?? '');
    const [queryResult, setQueryResult] = useState<Record<string, any>[]>([]);
    const [columns, setColumns] = useState<string[]>([]);
    const [hasExecutedQuery, setHasExecutedQuery] = useState(false);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);
    const [error, setError] = useState('');
    const [showSchema, setShowSchema] = useState(true);
    const [feedback, setFeedback] = useState<{
        match: boolean;
        message: string;
    } | null>(null);
    const initRef = useRef(false);
    const dbRef = useRef<any>(null);
    const connRef = useRef<any>(null);
    const workerRef = useRef<any>(null);

    const destroyEngineResources = useCallback(async () => {
        const currentConn = connRef.current;
        const currentDb = dbRef.current;
        const currentWorker = workerRef.current;

        connRef.current = null;
        dbRef.current = null;
        workerRef.current = null;

        if (currentConn) {
            try {
                await currentConn.close();
            } catch {
                // ignore
            }
        }

        if (currentDb) {
            try {
                await currentDb.terminate?.();
            } catch {
                // ignore
            }
        }

        if (currentWorker) {
            try {
                currentWorker.terminate?.();
            } catch {
                // ignore
            }
        }
    }, []);

    // ── Initialize DuckDB WASM ──────────────────────────────────
    useEffect(() => {
        if (initRef.current) return;
        initRef.current = true;

        const initDB = async () => {
            let localWorker: any = null;
            let localDb: any = null;
            let localConn: any = null;
            try {
                const duckdb = await import('@duckdb/duckdb-wasm');
                const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
                const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

                localWorker = await duckdb.createWorker(bundle.mainWorker!);
                const logger = new duckdb.ConsoleLogger();
                localDb = new duckdb.AsyncDuckDB(logger, localWorker);

                await localDb.instantiate(bundle.mainModule, bundle.pthreadWorker);
                localConn = await localDb.connect();

                // Run setup SQL (CREATE TABLE + INSERT)
                if (question.setupSQL) {
                    const stmts = question.setupSQL
                        .split(/;+(?=(?:(?:[^']*'){2})*[^']*$)/)
                        .map(s => s.trim())
                        .filter(s => s.length > 0);

                    for (const stmt of stmts) {
                        await localConn.query(stmt);
                    }
                }

                dbRef.current = localDb;
                connRef.current = localConn;
                workerRef.current = localWorker;
                setDb(localDb);
                setConn(localConn);
                setLoading(false);
            } catch (err: any) {
                try {
                    await localConn?.close?.();
                } catch {
                    // ignore
                }
                try {
                    await localDb?.terminate?.();
                } catch {
                    // ignore
                }
                try {
                    localWorker?.terminate?.();
                } catch {
                    // ignore
                }
                console.error('DuckDB init error:', err);
                setError('Failed to load SQL Engine: ' + err.message);
                setLoading(false);
            }
        };

        initDB();

        return () => {
            void destroyEngineResources();
        };
    }, [destroyEngineResources, question.setupSQL]);

    // ── Run query ───────────────────────────────────────────────
    const runQuery = useCallback(async () => {
        if (!conn || !query.trim()) return;
        setRunning(true);
        setError('');
        setFeedback(null);
        setQueryResult([]);
        setColumns([]);
        setHasExecutedQuery(false);

        try {
            // Strip SQL comments to avoid them interfering with execution
            const cleanQuery = query
                .replace(/--[^\n]*/g, '')
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .trim();
            if (!cleanQuery) {
                setError('Query is empty after removing comments');
                setRunning(false);
                return;
            }
            const arrowResult = await conn.query(cleanQuery);
            const resultJson = arrowResult
                .toArray()
                .map((row: any) => row.toJSON());

            if (resultJson.length > 0) {
                setColumns(Object.keys(resultJson[0]));
            }
            setQueryResult(resultJson);
            setHasExecutedQuery(true);
        } catch (err: any) {
            setError(err.message);
            setHasExecutedQuery(false);
        } finally {
            setRunning(false);
        }
    }, [conn, query]);

    // ── Submit and compare ──────────────────────────────────────
    const handleSubmit = useCallback(() => {
        if (!hasExecutedQuery) {
            setFeedback({
                match: false,
                message: 'Run your query first to see results before submitting',
            });
            return;
        }

        const comparison = compareResults(
            queryResult,
            question.expectedOutput,
            question.expectedColumns
        );

        onSubmit({
            isCorrect: comparison.match,
            userQuery: query.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim(),
            explanation: question.solution,
        });
    }, [hasExecutedQuery, queryResult, question, query, onSubmit]);

    // ── Reset editor ────────────────────────────────────────────
    const handleReset = useCallback(async () => {
        setQuery(question.starterCode ?? '');
        setQueryResult([]);
        setColumns([]);
        setHasExecutedQuery(false);
        setError('');
        setFeedback(null);

        setLoading(true);
        initRef.current = false;
        await destroyEngineResources();
        setDb(null);
        setConn(null);

        let worker: any = null;
        let newDb: any = null;
        let newConn: any = null;
        try {
            const duckdb = await import('@duckdb/duckdb-wasm');
            const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
            const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
            worker = await duckdb.createWorker(bundle.mainWorker!);
            const logger = new duckdb.ConsoleLogger();
            newDb = new duckdb.AsyncDuckDB(logger, worker);
            await newDb.instantiate(bundle.mainModule, bundle.pthreadWorker);
            newConn = await newDb.connect();

            if (question.setupSQL) {
                const stmts = question.setupSQL
                    .split(/;+(?=(?:(?:[^']*'){2})*[^']*$)/)
                    .map(s => s.trim())
                    .filter(s => s.length > 0);

                for (const stmt of stmts) {
                    await newConn.query(stmt);
                }
            }

            dbRef.current = newDb;
            connRef.current = newConn;
            workerRef.current = worker;
            setDb(newDb);
            setConn(newConn);
        } catch (err: any) {
            try {
                await newConn?.close?.();
            } catch {
                // ignore
            }
            try {
                await newDb?.terminate?.();
            } catch {
                // ignore
            }
            try {
                worker?.terminate?.();
            } catch {
                // ignore
            }
            setError('Failed to reset SQL Engine: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, [destroyEngineResources, question]);

    /* ── Loading state ─────────────────────────────────────────── */
    if (loading) {
        return (
            <div
                style={{
                    padding: '3rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1rem',
                }}
            >
                <Loader2
                    size={28}
                    color="var(--primary)"
                    style={{ animation: 'spin 1s linear infinite' }}
                />
                <p style={{ color: '#a5b4fc', fontSize: '0.9rem' }}>
                    Initializing SQL Engine...
                </p>
                <p style={{ color: '#4b5563', fontSize: '0.75rem' }}>
                    Loading DuckDB WASM and setting up tables
                </p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Left Column (Main Content) */}
            <div style={{ flex: '1 1 60%', minWidth: '300px' }}>
                {/* Question */}
                <div style={{ marginBottom: '1.5rem' }}>
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
                                background: 'rgba(99, 102, 241, 0.1)',
                                fontSize: '0.75rem',
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                color: '#6366f1',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                            }}
                        >
                            <Terminal size={12} /> SQL Hands-On
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
                        }}
                    >
                        {question.content}
                    </h2>
                </div>



                {/* Monaco Editor + Toolbar */}
                <div
                    style={{
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.08)',
                        marginBottom: '1rem',
                    }}
                >
                    {/* Toolbar */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 14px',
                            background: 'var(--subtle-bg)',
                            borderBottom: '1px solid var(--border-color)',
                        }}
                    >
                        <span
                            style={{
                                color: 'var(--text-primary)',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}
                        >
                            SQL Editor
                            <span
                                style={{
                                    fontSize: '0.65rem',
                                    padding: '2px 8px',
                                    background: 'rgba(99, 102, 241, 0.1)',
                                    color: 'var(--primary)',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(99, 102, 241, 0.2)',
                                }}
                            >
                                <Database size={10} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                                SSMS syntax supported
                            </span>
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={handleReset}
                                disabled={disabled}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--background)',
                                    color: 'var(--text-primary)',
                                    cursor: disabled ? 'default' : 'pointer',
                                    fontSize: '0.8rem',
                                }}
                            >
                                <RotateCcw size={13} /> Reset
                            </button>
                            <button
                                onClick={runQuery}
                                disabled={running || disabled}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 16px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: '#16a34a',
                                    color: 'white',
                                    cursor: running || disabled ? 'default' : 'pointer',
                                    fontSize: '0.8rem',
                                    fontWeight: '600',
                                    opacity: running || disabled ? 0.6 : 1,
                                }}
                            >
                                {running ? (
                                    <Loader2
                                        size={13}
                                        style={{ animation: 'spin 1s linear infinite' }}
                                    />
                                ) : (
                                    <Play size={13} />
                                )}
                                Run
                            </button>
                        </div>
                    </div>

                    {/* Editor */}
                    <div style={{ height: '200px' }}>
                        <Editor
                            height="100%"
                            defaultLanguage="sql"
                            theme="vs-dark"
                            value={query}
                            onChange={(val) => setQuery(val || '')}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                padding: { top: 12 },
                                lineNumbers: 'on',
                                scrollBeyondLastLine: false,
                                wordWrap: 'on',
                                readOnly: disabled,
                                renderLineHighlight: 'gutter',
                                automaticLayout: true,
                            }}
                        />
                    </div>
                </div>

                {/* Results area */}
                <div
                    style={{
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '1px solid var(--border-color)',
                        marginBottom: '1rem',
                        minHeight: '80px',
                    }}
                >
                    <div
                        style={{
                            padding: '8px 14px',
                            background: 'var(--subtle-bg)',
                            borderBottom: '1px solid var(--border-color)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            color: 'var(--text-primary)',
                        }}
                    >
                        <Terminal size={13} /> Output
                        {hasExecutedQuery && (
                            <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
                                {queryResult.length} row{queryResult.length !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>

                    <div
                        style={{
                            background: 'var(--background)',
                            padding: error ? '1rem' : 0,
                            maxHeight: '250px',
                            overflowY: 'auto',
                        }}
                    >
                        {error ? (
                            <div
                                style={{
                                    color: '#ef4444',
                                    fontFamily: 'monospace',
                                    fontSize: '0.8rem',
                                    padding: '0.5rem',
                                    background: 'rgba(239, 68, 68, 0.06)',
                                    borderRadius: '6px',
                                }}
                            >
                                Error: {error}
                            </div>
                        ) : queryResult.length > 0 ? (
                            <div style={{ overflowX: 'auto' }}>
                                <table
                                    style={{
                                        width: '100%',
                                        borderCollapse: 'collapse',
                                        fontSize: '0.8rem',
                                        fontFamily: 'monospace',
                                    }}
                                >
                                    <thead>
                                        <tr>
                                            {columns.map((col) => (
                                                <th
                                                    key={col}
                                                    style={{
                                                        padding: '8px 12px',
                                                        borderBottom: '1px solid var(--border-color)',
                                                        textAlign: 'left',
                                                        color: 'var(--primary)',
                                                        fontWeight: '700',
                                                        fontSize: '0.75rem',
                                                        position: 'sticky',
                                                        top: 0,
                                                        background: 'var(--subtle-bg)',
                                                    }}
                                                >
                                                    {col}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {queryResult.map((row, ri) => (
                                            <tr
                                                key={ri}
                                                style={{
                                                    background:
                                                        ri % 2 === 0
                                                            ? 'transparent'
                                                            : 'var(--subtle-bg)',
                                                }}
                                            >
                                                {columns.map((col) => (
                                                    <td
                                                        key={col}
                                                        style={{
                                                            padding: '6px 12px',
                                                            borderBottom: '1px solid var(--border-color)',
                                                            color: 'var(--text-primary)',
                                                        }}
                                                    >
                                                        {row[col] === null ? (
                                                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                                NULL
                                                            </span>
                                                        ) : (
                                                            String(row[col])
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : hasExecutedQuery ? (
                            <div
                                style={{
                                    padding: '2rem',
                                    textAlign: 'center',
                                    color: 'var(--text-muted)',
                                    fontSize: '0.85rem',
                                }}
                            >
                                0 rows returned
                            </div>
                        ) : (
                            <div
                                style={{
                                    padding: '2rem',
                                    textAlign: 'center',
                                    color: 'var(--text-muted)',
                                    fontSize: '0.85rem',
                                }}
                            >
                                Run your query to see results here
                            </div>
                        )}
                    </div>
                </div>

                {/* Feedback */}
                {feedback && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            padding: '1rem 1.25rem',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            marginBottom: '1rem',
                            background: feedback.match
                                ? 'rgba(16, 185, 129, 0.08)'
                                : 'rgba(239, 68, 68, 0.08)',
                            border: `1px solid ${feedback.match
                                ? 'rgba(16, 185, 129, 0.2)'
                                : 'rgba(239, 68, 68, 0.2)'
                                }`,
                            color: feedback.match ? '#10b981' : '#ef4444',
                            fontSize: '0.9rem',
                            fontWeight: '500',
                        }}
                    >
                        {feedback.match ? (
                            <CheckCircle2 size={20} />
                        ) : (
                            <XCircle size={20} />
                        )}
                        {feedback.message}
                    </motion.div>
                )}

                {/* Submit Button */}
                {!result && (
                    <motion.button
                        whileHover={{ scale: disabled ? 1 : 1.02 }}
                        whileTap={{ scale: disabled ? 1 : 0.98 }}
                        onClick={handleSubmit}
                        disabled={disabled || !hasExecutedQuery}
                        className="btn-primary"
                        style={{
                            width: '100%',
                            justifyContent: 'center',
                            padding: '14px',
                            opacity: disabled || !hasExecutedQuery ? 0.5 : 1,
                        }}
                    >
                        <CheckCircle2 size={18} />
                        Submit Answer
                    </motion.button>
                )}
            </div>

            {((question.sampleData && question.sampleData.length > 0) || question.setupSQL) && (
                <div style={{ flex: '1 1 30%', minWidth: '250px' }}>
                    <div style={{
                        position: 'sticky',
                        top: '1.5rem',
                        background: 'var(--subtle-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '12px 16px',
                            background: 'var(--subtle-bg)',
                            borderBottom: '1px solid var(--border-color)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: 'var(--text-primary)',
                            fontWeight: '600',
                            fontSize: '0.85rem'
                        }}>
                            <Database size={15} /> Database Reference
                        </div>

                        <div style={{ padding: '16px', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                            {question.setupSQL && (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>
                                        Schema (Setup SQL)
                                    </div>
                                    <div style={{
                                        padding: '12px',
                                        background: 'var(--background)',
                                        borderRadius: '8px',
                                        fontSize: '0.7rem',
                                        color: 'var(--text-primary)',
                                        fontFamily: 'monospace',
                                        whiteSpace: 'pre-wrap',
                                        border: '1px solid var(--border-color)'
                                    }}>
                                        {question.setupSQL}
                                    </div>
                                </div>
                            )}

                            {question.sampleData && question.sampleData.length > 0 && (
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>
                                        Sample Data (3-5 Rows)
                                    </div>
                                    {question.sampleData.map((table) => (
                                        <div key={table.tableName} style={{
                                            marginBottom: '1rem',
                                            borderRadius: '8px',
                                            overflow: 'hidden',
                                            border: '1px solid var(--border-color)'
                                        }}>
                                            <div style={{
                                                padding: '6px 12px',
                                                background: 'var(--subtle-bg)',
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                color: 'var(--primary)',
                                                borderBottom: '1px solid var(--border-color)'
                                            }}>
                                                Table: {table.tableName}
                                            </div>
                                            <div style={{ overflowX: 'auto' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem', fontFamily: 'monospace' }}>
                                                    <thead>
                                                        <tr>
                                                            {Object.keys(table.rows[0] ?? {}).map(col => (
                                                                <th key={col} style={{
                                                                    padding: '4px 8px',
                                                                    textAlign: 'left',
                                                                    color: 'var(--text-muted)',
                                                                    borderBottom: '1px solid var(--border-color)'
                                                                }}>{col}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {table.rows.map((row, ri) => (
                                                            <tr key={ri} style={{ background: ri % 2 === 0 ? 'transparent' : 'var(--subtle-bg)' }}>
                                                                {Object.values(row).map((val: any, ci) => (
                                                                    <td key={ci} style={{
                                                                        padding: '4px 8px',
                                                                        color: 'var(--text-primary)',
                                                                        borderBottom: '1px solid var(--border-color)'
                                                                    }}>
                                                                        {val === null ? <span style={{ color: 'var(--text-muted)' }}>NULL</span> : String(val)}
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
