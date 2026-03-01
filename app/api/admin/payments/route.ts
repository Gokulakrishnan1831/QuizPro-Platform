import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { ensureTables } from '@/lib/db-init';
import prisma from '@/lib/prisma';

const PLAN_CONFIG: Record<string, { quizzes: number }> = {
    BASIC: { quizzes: 3 },
    PRO: { quizzes: 10 },
    ELITE: { quizzes: 20 },
};

/**
 * GET /api/admin/payments — list all payment requests
 * PATCH /api/admin/payments — approve or reject a request
 */

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'quizpro-admin-secret-key-change-in-production';

export async function GET(request: Request) {
    const cookieHeader = request.headers.get('cookie') || '';
    const token = cookieHeader.match(/admin_token=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try { jwt.verify(token, JWT_SECRET); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') ?? 'pending';
    const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '50', 10));

    try {
        await ensureTables();
        const db = prisma as any;

        const rows = await db.$queryRawUnsafe(
            `SELECT id, user_id, user_email, user_name, tier, amount,
              upi_transaction_id, screenshot_base64, status, admin_notes,
              created_at, reviewed_at
       FROM "PaymentRequest"
       WHERE ($1 = 'all' OR status = $1)
       ORDER BY created_at DESC
       LIMIT $2`,
            status,
            limit,
        );

        return NextResponse.json({ requests: rows });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const cookieHeader = request.headers.get('cookie') || '';
    const token = cookieHeader.match(/admin_token=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try { jwt.verify(token, JWT_SECRET); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

    try {
        const { requestId, action, adminNotes } = await request.json();
        // action: 'approve' | 'reject'

        if (!requestId || !['approve', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        await ensureTables();
        const db = prisma as any;

        // Fetch the payment request
        const rows = await db.$queryRawUnsafe(
            `SELECT * FROM "PaymentRequest" WHERE id = $1 LIMIT 1`,
            requestId
        );

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Payment request not found' }, { status: 404 });
        }

        const pr = rows[0];

        if (pr.status !== 'pending') {
            return NextResponse.json({ error: `Request already ${pr.status}` }, { status: 409 });
        }

        const newStatus = action === 'approve' ? 'approved' : 'rejected';

        // Update payment request status
        await db.$executeRawUnsafe(
            `UPDATE "PaymentRequest"
       SET status = $1, admin_notes = $2, reviewed_at = NOW()
       WHERE id = $3`,
            newStatus,
            adminNotes ?? null,
            requestId,
        );

        // If approved → upgrade user tier in Prisma User table
        if (action === 'approve') {
            const quizzes = PLAN_CONFIG[pr.tier]?.quizzes ?? 3;
            try {
                await db.user.update({
                    where: { id: pr.user_id },
                    data: {
                        subscriptionTier: pr.tier,
                        quizzesRemaining: quizzes,
                    },
                });
            } catch (prismaErr) {
                // Fallback: raw SQL update
                await db.$executeRawUnsafe(
                    `UPDATE "User"
           SET "subscriptionTier" = $1, "quizzesRemaining" = $2
           WHERE id = $3`,
                    pr.tier,
                    quizzes,
                    pr.user_id,
                );
            }
        }

        return NextResponse.json({ success: true, status: newStatus });
    } catch (err: any) {
        console.error('[admin/payments] PATCH error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
