import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();

    const session = await prisma.quizSession.findUnique({
      where: { id: sessionId },
      include: { questions: true }
    });

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const score = (session.correctCount / session.totalQuestions) * 100;

    const updatedSession = await prisma.quizSession.update({
      where: { id: sessionId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        score
      }
    });

    // Update User Progress for the skill
    // (Assuming all questions in session are for the same skill for now)
    const firstQuestion = await prisma.quizQuestion.findFirst({
      where: { sessionId },
      include: { question: true }
    });

    if (firstQuestion) {
      const skillId = firstQuestion.question.skillId;
      const userId = session.userId;

      const progress = await prisma.userProgress.upsert({
        where: { userId_skillId: { userId, skillId } },
        update: {
          totalAttempted: { increment: session.totalQuestions },
          totalCorrect: { increment: session.correctCount },
          lastPracticed: new Date(),
          // Simple accuracy update
        },
        create: {
          userId,
          skillId,
          totalAttempted: session.totalQuestions,
          totalCorrect: session.correctCount,
          accuracy: score,
          lastPracticed: new Date(),
        }
      });
      
      // Recalculate accuracy
      await prisma.userProgress.update({
        where: { id: progress.id },
        data: {
          accuracy: (progress.totalCorrect / progress.totalAttempted) * 100
        }
      });
    }

    return NextResponse.json(updatedSession);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to complete quiz' }, { status: 500 });
  }
}
