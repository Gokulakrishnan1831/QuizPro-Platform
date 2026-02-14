import { NextResponse } from 'next/server';
import { generateAIQuestion } from '@/lib/ai/question-generator';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { skillId, difficulty, userId } = await request.json();

    if (!skillId || !difficulty) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
      include: { domain: true }
    });

    if (!skill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }

    // Fetch some context to avoid duplicates if userId is provided
    let seenQuestions: string[] = [];
    if (userId) {
      const history = await prisma.userQuestionHistory.findMany({
        where: { userId },
        take: 10,
        orderBy: { answeredAt: 'desc' },
        include: { question: true }
      });
      seenQuestions = history.map(h => h.question.question);
    }

    const aiQuestion = await generateAIQuestion({
      skill: skill.name,
      difficulty,
      seenQuestions
    });

    // Save the generated question to the database
    const savedQuestion = await prisma.question.create({
      data: {
        question: aiQuestion.question,
        options: JSON.stringify(aiQuestion.options),
        correctAnswer: aiQuestion.correctAnswer,
        explanation: aiQuestion.explanation,
        difficulty: aiQuestion.difficulty,
        topics: JSON.stringify(aiQuestion.topics),
        source: 'ai_generated',
        skillId: skill.id,
        verified: false
      }
    });

    return NextResponse.json(savedQuestion);

  } catch (error: any) {
    console.error('AI Generation Route Error:', error);
    return NextResponse.json({ error: 'Failed to generate question' }, { status: 500 });
  }
}
