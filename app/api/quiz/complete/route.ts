import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getQuizById, getUserById, createQuizAttempt, getUserProgress, upsertUserProgress } from '@/lib/firebase/db';
import { groqSummaryCompletion } from '@/lib/ai/groq-client';
import { buildPerformanceSummaryPrompt } from '@/lib/ai/prompts';
import { postProcessQuestions } from '@/lib/ai/post-process';
import {
  cellRefToCoords,
  coordsToCellRef,
  evaluateGridWithFormulas,
  formulasMatch,
} from '@/lib/excel/engine';

let duckdbPromise: Promise<typeof import('@duckdb/duckdb-wasm')> | null = null;

async function getDuckDb() {
  if (!duckdbPromise) {
    duckdbPromise = import('@duckdb/duckdb-wasm');
  }
  return duckdbPromise;
}

function splitSqlStatements(sql: string): string[] {
  return sql
    .split(/;+(?=(?:(?:[^']*'){2})*[^']*$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function normalizeValue(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'bigint') return String(val);
  return String(val).trim().toLowerCase();
}

function normalizeSql(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/;+\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function stripSqlComments(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();
}

function compareResults(
  actual: Record<string, any>[],
  expected: Record<string, any>[],
  expectedColumns?: string[],
): { match: boolean; message: string } {
  if (actual.length !== expected.length) {
    return {
      match: false,
      message: `Row count mismatch: got ${actual.length} rows, expected ${expected.length}`,
    };
  }

  if (actual.length === 0 && expected.length === 0) {
    return { match: true, message: 'Both results are empty - correct!' };
  }

  const actualCols = Object.keys(actual[0] ?? {}).map((c) => c.toLowerCase());
  const expectedCols = expectedColumns
    ? expectedColumns.map((c) => c.toLowerCase())
    : Object.keys(expected[0] ?? {}).map((c) => c.toLowerCase());

  const serializeByName = (row: Record<string, any>, cols: string[]) =>
    cols
      .map((c) => {
        const key = Object.keys(row).find((k) => k.toLowerCase() === c);
        return normalizeValue(key ? row[key] : null);
      })
      .join('|');

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

async function runDuckDbQuery(
  setupSQL: string,
  query: string,
): Promise<Record<string, any>[]> {
  const duckdb = await getDuckDb();
  const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
  const worker = await duckdb.createWorker(bundle.mainWorker!);
  const logger = new duckdb.ConsoleLogger();
  const dbInst = new duckdb.AsyncDuckDB(logger, worker);

  await dbInst.instantiate(bundle.mainModule, bundle.pthreadWorker);
  const conn = await dbInst.connect();

  try {
    for (const stmt of splitSqlStatements(setupSQL)) {
      await conn.query(stmt);
    }

    const arrowResult = await conn.query(query);
    return arrowResult.toArray().map((row: any) => row.toJSON());
  } finally {
    try {
      await conn.close();
    } catch {
      // ignore
    }
    try {
      await (dbInst as any).terminate?.();
    } catch {
      // ignore
    }
    try {
      (worker as any)?.terminate?.();
    } catch {
      // ignore
    }
  }
}

async function gradeSqlHandsOn(
  question: any,
  userQuery: string,
): Promise<{ isCorrect: boolean }> {
  if (!userQuery || !String(userQuery).trim()) return { isCorrect: false };
  if (!question?.setupSQL) return { isCorrect: false };

  const cleanQuery = stripSqlComments(String(userQuery));
  if (!cleanQuery) return { isCorrect: false };

  const expectedOutput = Array.isArray(question.expectedOutput)
    ? question.expectedOutput
    : [];
  const expectedColumns = Array.isArray(question.expectedColumns)
    ? question.expectedColumns
    : undefined;

  const rows = await runDuckDbQuery(question.setupSQL, cleanQuery);
  const comparison = compareResults(rows, expectedOutput, expectedColumns);
  return { isCorrect: comparison.match };
}

function compareExcelValues(
  actual: string | number | null | undefined,
  expected: string | number,
  tolerance: number
): boolean {
  const actualNorm = String(actual ?? '').trim().toLowerCase();
  const expectedNorm = String(expected ?? '').trim().toLowerCase();
  const actualNum = parseFloat(actualNorm);
  const expectedNum = parseFloat(expectedNorm);
  if (!Number.isNaN(actualNum) && !Number.isNaN(expectedNum)) {
    return Math.abs(actualNum - expectedNum) <= tolerance;
  }
  return actualNorm === expectedNorm;
}

function parseExcelUserAnswer(userAnswer: unknown): Record<string, { raw: string; value?: unknown }> {
  if (typeof userAnswer !== 'string') return {};
  try {
    const parsed = JSON.parse(userAnswer);
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Record<string, { raw: string; value?: unknown }> = {};
    for (const [cellRef, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (value && typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        out[cellRef] = {
          raw: typeof obj.raw === 'string' ? obj.raw : '',
          value: obj.value,
        };
      } else {
        out[cellRef] = { raw: typeof value === 'string' ? value : '' };
      }
    }
    return out;
  } catch {
    return {};
  }
}

async function gradeExcelHandsOn(
  question: any,
  userAnswer: unknown
): Promise<{ isCorrect: boolean }> {
  const initialData = Array.isArray(question?.initialData) ? question.initialData : [[]];
  const editableCells = Array.isArray(question?.editableCells) ? question.editableCells : [];
  const expectedValues = Array.isArray(question?.expectedValues) ? question.expectedValues : [];
  const expectedFormulas = Array.isArray(question?.expectedFormulas) ? question.expectedFormulas : [];
  const tolerance = typeof question?.valueTolerance === 'number' ? question.valueTolerance : 0.01;

  const submitted = parseExcelUserAnswer(userAnswer);
  const cellInputs: Record<string, string> = {};

  for (const [cellRef, entry] of Object.entries(submitted)) {
    const coords = cellRefToCoords(cellRef);
    if (!coords) continue;
    cellInputs[`${coords.row}-${coords.col}`] = entry.raw ?? '';
  }

  const { values, errors } = evaluateGridWithFormulas(initialData, cellInputs);
  const expectedFormulaMap = new Map<string, string[]>();
  const expectedValueMap = new Map<string, string | number>();

  for (const item of expectedFormulas) {
    expectedFormulaMap.set(`${item.row}-${item.col}`, Array.isArray(item.formulas) ? item.formulas : []);
  }
  for (const item of expectedValues) {
    expectedValueMap.set(`${item.row}-${item.col}`, item.value);
  }

  const targetCells = editableCells.length > 0
    ? editableCells
    : Array.from(
      new Set([...Array.from(expectedFormulaMap.keys()), ...Array.from(expectedValueMap.keys())])
    ).map((k) => k.split('-').map(Number) as [number, number]);

  let allCorrect = true;
  for (const [row, col] of targetCells) {
    const key = `${row}-${col}`;
    const cellRef = coordsToCellRef(row, col);
    const raw = (submitted[cellRef]?.raw ?? '').trim();

    if (errors[key]) {
      allCorrect = false;
      continue;
    }

    const acceptableFormulas = expectedFormulaMap.get(key) ?? [];
    if (acceptableFormulas.length > 0) {
      if (!raw.startsWith('=') || !formulasMatch(raw, acceptableFormulas)) {
        allCorrect = false;
        continue;
      }
    }

    if (expectedValueMap.has(key)) {
      const expectedValue = expectedValueMap.get(key)!;
      const actualValue = values[row]?.[col] ?? null;
      if (!compareExcelValues(actualValue, expectedValue, tolerance)) {
        allCorrect = false;
      }
    }
  }

  return { isCorrect: allCorrect };
}

async function gradePowerBiFillBlank(
  question: any,
  userAnswer: unknown
): Promise<{ isCorrect: boolean }> {
  const actual = String(userAnswer ?? '').trim();
  if (!actual) return { isCorrect: false };

  const accepted = Array.isArray(question?.acceptedAnswers)
    ? question.acceptedAnswers.filter((v: any) => typeof v === 'string')
    : [];
  if (accepted.length === 0) return { isCorrect: false };
  const caseSensitive = Boolean(question?.caseSensitive);

  const normalize = (v: string) => caseSensitive ? v.trim() : v.trim().toLowerCase();
  const actualNorm = normalize(actual);
  const acceptedSet = new Set(accepted.map((v: string) => normalize(v)));
  return { isCorrect: acceptedSet.has(actualNorm) };
}

/**
 * POST /api/quiz/complete
 *
 * Submit all answers for a quiz, compute score, save QuizAttempt,
 * update UserProgress, and generate an AI summary.
 *
 * Body: { quizId, answers: [{ questionIndex, userAnswer, confidence? }], timeTaken, questions? }
 */
export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quizId, answers, timeTaken, questions: clientQuestions, tabSwitchCount, terminatedByProctor } = await request.json();

    if (!quizId || !answers) {
      return NextResponse.json(
        { error: 'quizId and answers are required' },
        { status: 400 },
      );
    }

    // Try to load quiz from Firestore; fall back to client-supplied questions
    let questions: any[];
    let quizPersona = 'FRESHER';
    let quizProfileType = authUser.profileType ?? 'FRESHER';

    const quiz = await getQuizById(quizId);
    if (quiz) {
      questions = quiz.questions as any[];
      quizPersona = quiz.persona;
    } else {
      questions = clientQuestions ?? [];
    }

    if (questions.length === 0) {
      return NextResponse.json(
        { error: 'Quiz questions not available for grading' },
        { status: 400 },
      );
    }
    questions = postProcessQuestions(questions);

    // ── Grade each answer ────────────────────────────────────────────
    let totalCorrect = 0;
    const gradedAnswers: any[] = [];
    const wrongAnswers: any[] = [];

    for (const ans of answers) {
      const q = questions[ans.questionIndex];
      if (!q) continue;

      const qType = (q.type ?? 'MCQ').toUpperCase();
      let isCorrect = false;

      if (qType === 'SQL_HANDS_ON') {
        try {
          const graded = await gradeSqlHandsOn(q, ans.userAnswer);
          isCorrect = graded.isCorrect;
        } catch {
          const correctSql = q.solution ?? q.correctAnswer ?? '';
          isCorrect = normalizeSql(String(ans.userAnswer)) === normalizeSql(String(correctSql));
        }
      } else if (qType === 'EXCEL_HANDS_ON') {
        try {
          const graded = await gradeExcelHandsOn(q, ans.userAnswer);
          isCorrect = graded.isCorrect;
        } catch {
          isCorrect = false;
        }
      } else if (qType === 'POWERBI_FILL_BLANK') {
        try {
          const graded = await gradePowerBiFillBlank(q, ans.userAnswer);
          isCorrect = graded.isCorrect;
        } catch {
          isCorrect = false;
        }
      } else {
        isCorrect =
          String(ans.userAnswer).trim().toLowerCase() ===
          String(q.correctAnswer).trim().toLowerCase();
      }

      if (isCorrect) totalCorrect++;

      const displayCorrectAnswer =
        qType === 'SQL_HANDS_ON' || qType === 'EXCEL_HANDS_ON'
          ? q.solution ?? ''
          : qType === 'POWERBI_FILL_BLANK'
            ? (Array.isArray(q.acceptedAnswers) ? q.acceptedAnswers[0] : '')
            : q.correctAnswer;

      gradedAnswers.push({
        questionIndex: ans.questionIndex,
        userAnswer: ans.userAnswer,
        confidence: ans.confidence ?? null,
        isCorrect,
        correctAnswer: displayCorrectAnswer,
      });

      if (!isCorrect) {
        wrongAnswers.push({
          questionIndex: ans.questionIndex,
          content: q.content,
          userAnswer: ans.userAnswer,
          correctAnswer: displayCorrectAnswer,
          explanation: q.solution,
          skill: q.skill,
        });
      }
    }

    const score =
      answers.length > 0 ? (totalCorrect / answers.length) * 100 : 0;

    // ── Generate AI summary ──────────────────────────────────────────
    let aiSummary: string | null = null;
    try {
      if (wrongAnswers.length > 0) {
        const summaryPrompt = buildPerformanceSummaryPrompt({
          profileType: quizProfileType as any,
          score: totalCorrect,
          totalQuestions: answers.length,
          wrongAnswers: wrongAnswers.map((w: any) => ({
            skill: w.skill,
            question: w.content,
            userAnswer: w.userAnswer,
            correctAnswer: w.correctAnswer,
          })),
        });

        aiSummary = await groqSummaryCompletion(summaryPrompt);
      } else {
        aiSummary =
          'Perfect score! You demonstrated strong command across all topics tested. Keep challenging yourself with harder difficulty levels.';
      }
    } catch {
      aiSummary = null;
    }

    // ── Parse focus topics from AI summary ────────────────────────────
    let focusTopics: string[] = [];
    if (aiSummary) {
      try {
        const topicsMatch = aiSummary.match(/TOPICS:\s*\n?(\[[\s\S]*?\])/);
        if (topicsMatch?.[1]) {
          focusTopics = JSON.parse(topicsMatch[1]);
        }
        const summaryMatch = aiSummary.match(/SUMMARY:\s*\n?([\s\S]*?)(?=\nTOPICS:|$)/);
        if (summaryMatch?.[1]) {
          aiSummary = summaryMatch[1].trim();
        }
      } catch {
        // Keep full summary if parsing fails
      }
    }

    // ── Persist QuizAttempt to Firestore ─────────────────────────────
    let attemptId: string | null = null;
    try {
      attemptId = await createQuizAttempt({
        userId: authUser.id,
        quizId,
        answers: gradedAnswers,
        score,
        timeTaken: timeTaken ?? 0,
        wrongAnswers,
        aiSummary,
        focusTopics,
        ...(typeof tabSwitchCount === 'number' ? { tabSwitchCount } : {}),
        ...(typeof terminatedByProctor === 'boolean' ? { terminatedByProctor } : {}),
      });
    } catch (err) {
      console.error('Failed to persist quiz attempt:', err);
      attemptId = null;
    }

    // ── Update UserProgress per skill ────────────────────────────────
    try {
      const skillStats: Record<string, { attempted: number; correct: number }> = {};
      for (const ans of gradedAnswers) {
        const q = questions[ans.questionIndex];
        if (!q) continue;
        const s = q.skill;
        if (!skillStats[s]) skillStats[s] = { attempted: 0, correct: 0 };
        skillStats[s].attempted++;
        if (ans.isCorrect) skillStats[s].correct++;
      }

      for (const [skill, counts] of Object.entries(skillStats)) {
        const existing = await getUserProgress(authUser.id, skill);

        if (existing) {
          const newAttempted = existing.totalAttempted + counts.attempted;
          const newCorrect = existing.totalCorrect + counts.correct;
          const newAccuracy = newAttempted > 0 ? (newCorrect / newAttempted) * 100 : 0;

          await upsertUserProgress(authUser.id, skill, {
            totalAttempted: newAttempted,
            totalCorrect: newCorrect,
            accuracy: newAccuracy,
          });
        } else {
          const accuracy = counts.attempted > 0 ? (counts.correct / counts.attempted) * 100 : 0;
          await upsertUserProgress(authUser.id, skill, {
            totalAttempted: counts.attempted,
            totalCorrect: counts.correct,
            accuracy,
          });
        }
      }
    } catch (err) {
      console.error('Failed to update user progress:', err);
    }

    return NextResponse.json({
      attemptId,
      score: Number(score.toFixed(2)),
      totalCorrect,
      totalQuestions: answers.length,
      aiSummary,
      focusTopics,
      wrongCount: wrongAnswers.length,
      gradedAnswers: gradedAnswers.map((ga) => {
        const q = questions[ga.questionIndex];
        return {
          ...ga,
          content: q?.content ?? '',
          correctAnswer:
            ['SQL_HANDS_ON', 'EXCEL_HANDS_ON'].includes((q?.type ?? 'MCQ').toUpperCase())
              ? q?.solution ?? ''
              : (q?.type ?? 'MCQ').toUpperCase() === 'POWERBI_FILL_BLANK'
                ? (Array.isArray(q?.acceptedAnswers) ? q.acceptedAnswers[0] ?? '' : '')
                : q?.correctAnswer ?? '',
          solution: q?.solution ?? '',
          skill: q?.skill ?? '',
          type: q?.type ?? 'MCQ',
        };
      }),
    });
  } catch (error: any) {
    console.error('Quiz complete error:', error);
    return NextResponse.json(
      { error: 'Failed to complete quiz' },
      { status: 500 },
    );
  }
}
