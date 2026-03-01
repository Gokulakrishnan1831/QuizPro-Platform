import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createQuestion } from '@/lib/firebase/db';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'quizpro-admin-secret-key-change-in-production';

/**
 * POST /api/admin/questions/bulk
 *
 * Bulk-import questions into the Firestore question bank.
 */
export async function POST(req: NextRequest) {
  const cookieHeader = req.headers.get('cookie') || '';
  const token = cookieHeader.match(/admin_token=([^;]+)/)?.[1];
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { jwt.verify(token, JWT_SECRET); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const body = await req.json();

    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Input must be an array of questions' },
        { status: 400 },
      );
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: { question: string; error: string }[] = [];

    for (const item of body) {
      try {
        const {
          skill,
          type,
          content,
          options,
          correctAnswer,
          solution,
          difficulty,
          metadata,
        } = item;

        if (!skill || !type || !content || !correctAnswer || !solution) {
          throw new Error(
            `Missing required fields for: "${content?.substring(0, 30)}…"`,
          );
        }

        await createQuestion({
          skill,
          type,
          content,
          options: options ?? null,
          correctAnswer,
          solution,
          difficulty: difficulty ?? 5,
          metadata: metadata ?? null,
        });

        successCount++;
      } catch (err: any) {
        console.error('Error importing question:', err);
        errorCount++;
        errors.push({ question: item.content, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${body.length} items`,
      successCount,
      errorCount,
      errors,
    });
  } catch (error: any) {
    console.error('Bulk upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 },
    );
  }
}
