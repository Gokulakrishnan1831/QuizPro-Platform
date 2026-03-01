import { NextResponse } from 'next/server';
import { generateAIQuestion } from '@/lib/ai/question-generator';
import { createQuestion } from '@/lib/firebase/db';

/**
 * POST /api/ai/generate
 *
 * Generate a single AI question and optionally save it to the Firestore question bank.
 *
 * Body: { skill, difficulty, save? }
 */
export async function POST(request: Request) {
  try {
    const { skill, difficulty = 5, save = false } = await request.json();

    if (!skill) {
      return NextResponse.json(
        { error: 'skill is required (EXCEL | SQL | POWERBI)' },
        { status: 400 },
      );
    }

    const allowed = new Set(['EXCEL', 'SQL', 'POWERBI']);
    if (!allowed.has(String(skill).toUpperCase())) {
      return NextResponse.json(
        { error: 'Invalid skill. Allowed: EXCEL | SQL | POWERBI' },
        { status: 400 },
      );
    }

    const aiQuestion = await generateAIQuestion({ skill, difficulty });
    const typeUpper = String(aiQuestion?.type ?? 'MCQ').toUpperCase();
    const isFillBlank = typeUpper === 'POWERBI_FILL_BLANK';

    if (save) {
      const id = await createQuestion({
        skill: aiQuestion.skill,
        type: isFillBlank ? 'MCQ' : (aiQuestion.type || 'MCQ'),
        content: aiQuestion.content,
        options: isFillBlank ? null : (aiQuestion.options ?? null),
        correctAnswer: isFillBlank
          ? (aiQuestion.acceptedAnswers?.[0] ?? '')
          : aiQuestion.correctAnswer,
        solution: aiQuestion.solution,
        difficulty: aiQuestion.difficulty ?? difficulty,
        metadata: isFillBlank
          ? {
            type: 'POWERBI_FILL_BLANK',
            blankLabel: aiQuestion.blankLabel ?? 'Answer',
            acceptedAnswers: aiQuestion.acceptedAnswers ?? [],
            caseSensitive: Boolean(aiQuestion.caseSensitive),
          }
          : undefined,
      });
      return NextResponse.json({ id, ...aiQuestion });
    }

    return NextResponse.json(aiQuestion);
  } catch (error: any) {
    console.error('AI Generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate question' },
      { status: 500 },
    );
  }
}
