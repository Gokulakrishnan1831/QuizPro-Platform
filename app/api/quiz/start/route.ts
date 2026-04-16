import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { generateQuizForUser } from '@/lib/quiz/generation-service';

export const maxDuration = 60; // Allow 60 seconds on Vercel Pro/Hobby fallback


/**
 * POST /api/quiz/start
 *
 * Generates a new quiz and stores it in Firestore.
 */
export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const payload = { ...body, includeHandsOn: body?.includeHandsOn ?? true };
    const result = await generateQuizForUser(authUser as any, payload);
    if (!result.success) {
      const status = result.error?.toLowerCase().includes('quota') ? 403 : 500;
      return NextResponse.json({ error: result.error ?? 'Failed to start quiz' }, { status });
    }

    return NextResponse.json({
      quizId: result.quizId,
      questionCount: result.questionCount,
      questions: result.questions,
      timerMins: result.timerMins,
    });
  } catch (error) {
    console.error('Quiz start error:', error);
    return NextResponse.json({ error: 'Failed to start quiz' }, { status: 500 });
  }
}
