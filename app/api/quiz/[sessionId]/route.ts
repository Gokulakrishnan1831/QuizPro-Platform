import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { postProcessQuestions } from '@/lib/ai/post-process';

/**
 * GET /api/quiz/[sessionId]
 *
 * Fetch a quiz by ID. Returns the quiz questions for the playback UI.
 * The `sessionId` param is actually the quiz ID in the new schema.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const db = prisma as any;

    const quiz = await db.quiz?.findUnique?.({
      where: { id: sessionId },
    }).catch(() => null);

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const rawQuestions = quiz.questions as any[];
    const questions = postProcessQuestions(rawQuestions);

    return NextResponse.json({
      id: quiz.id,
      persona: quiz.persona,
      timerMins: quiz.timerMins,
      totalQuestions: questions.length,
      questions: questions.map((q: any, index: number) => {
        const qType = (q.type ?? 'MCQ').toUpperCase();

        if (qType === 'SQL_HANDS_ON') {
          return {
            index,
            type: q.type,
            skill: q.skill,
            content: q.content,
            difficulty: q.difficulty,
            setupSQL: q.setupSQL,
            sampleData: q.sampleData,
            expectedOutput: q.expectedOutput,
            expectedColumns: q.expectedColumns,
            starterCode: q.starterCode,
            // correctAnswer and solution are NOT sent — graded server-side
          };
        }

        if (qType === 'EXCEL_HANDS_ON') {
          return {
            index,
            type: q.type,
            skill: q.skill,
            content: q.content,
            difficulty: q.difficulty,
            columns: q.columns,
            initialData: q.initialData,
            editableCells: q.editableCells,
            expectedValues: q.expectedValues,
            expectedFormulas: q.expectedFormulas,
            engineMode: q.engineMode,
            allowEquivalentFormula: q.allowEquivalentFormula,
            valueTolerance: q.valueTolerance,
            // correctAnswer and solution are NOT sent — graded server-side
          };
        }

        if (qType === 'POWERBI_FILL_BLANK') {
          return {
            index,
            type: q.type,
            skill: q.skill,
            content: q.content,
            blankLabel: q.blankLabel,
            caseSensitive: q.caseSensitive ?? false,
            difficulty: q.difficulty,
            // acceptedAnswers and solution are hidden for server-side grading
          };
        }

        return {
          index,
          type: q.type,
          skill: q.skill,
          content: q.content,
          options: q.options,
          difficulty: q.difficulty,
          // correctAnswer and solution are NOT sent — graded server-side
        };
      }),
    });
  } catch (error) {
    console.error('Quiz fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
