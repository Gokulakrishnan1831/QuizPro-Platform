import { NextResponse } from 'next/server';
import { getQuizById } from '@/lib/firebase/db';
import { postProcessQuestions } from '@/lib/ai/post-process';

/**
 * POST /api/quiz/answer
 *
 * Grade a single question answer. Returns whether it's correct,
 * the correct answer, and the solution/explanation.
 *
 * Body: { quizId, questionIndex, userAnswer }
 */
export async function POST(request: Request) {
  try {
    const { quizId, questionIndex, userAnswer } = await request.json();

    if (!quizId || questionIndex === undefined || !userAnswer) {
      return NextResponse.json(
        { error: 'quizId, questionIndex, and userAnswer are required' },
        { status: 400 },
      );
    }

    const quiz = await getQuizById(quizId);

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const questions = postProcessQuestions(quiz.questions as any[]);
    const question = questions[questionIndex];

    if (!question) {
      return NextResponse.json(
        { error: 'Question index out of range' },
        { status: 400 },
      );
    }

    const qType = String(question.type ?? 'MCQ').toUpperCase();
    let isCorrect = false;
    if (qType === 'POWERBI_FILL_BLANK') {
      const caseSensitive = Boolean(question.caseSensitive);
      const normalize = (v: string) => caseSensitive ? v.trim() : v.trim().toLowerCase();
      const actual = normalize(String(userAnswer ?? ''));
      const accepted = Array.isArray(question.acceptedAnswers)
        ? question.acceptedAnswers.filter((v: any) => typeof v === 'string').map((v: string) => normalize(v))
        : [];
      isCorrect = accepted.includes(actual);
    } else if (qType === 'SQL_HANDS_ON' || qType === 'EXCEL_HANDS_ON') {
      return NextResponse.json({
        isCorrect: null,
        correctAnswer: question.solution ?? '',
        explanation: question.solution,
      });
    } else if (qType === 'SCENARIO_SUBJECTIVE') {
      // Subjective is graded at quiz completion by LLM, not per-question
      return NextResponse.json({
        isCorrect: null,
        correctAnswer: question.sampleAnswer ?? '',
        explanation: question.rubric ?? '',
      });
    } else if (qType === 'SCENARIO_MCQ') {
      // Scenario MCQ — graded like regular MCQ
      isCorrect =
        String(userAnswer).trim().toLowerCase() ===
        String(question.correctAnswer).trim().toLowerCase();
    } else {
      isCorrect =
        String(userAnswer).trim().toLowerCase() ===
        String(question.correctAnswer).trim().toLowerCase();
    }

    return NextResponse.json({
      isCorrect,
      correctAnswer:
        qType === 'POWERBI_FILL_BLANK'
          ? (Array.isArray(question.acceptedAnswers) ? question.acceptedAnswers[0] : '')
          : question.correctAnswer,
      explanation: question.solution,
    });
  } catch (error) {
    console.error('Answer grade error:', error);
    return NextResponse.json(
      { error: 'Failed to grade answer' },
      { status: 500 },
    );
  }
}
