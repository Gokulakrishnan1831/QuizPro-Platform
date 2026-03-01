import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { Timestamp } from 'firebase-admin/firestore';
import { getPaymentRequests, updatePaymentRequest, updateUser } from '@/lib/firebase/db';
import { db } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';

const PLAN_CONFIG: Record<string, { quizzes: number }> = {
    BASIC: { quizzes: 3 },
    PRO: { quizzes: 10 },
    ELITE: { quizzes: 20 },
};

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'quizpro-admin-secret-key-change-in-production';

export async function GET(request: Request) {
    const cookieHeader = request.headers.get('cookie') || '';
    const token = cookieHeader.match(/admin_token=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try { jwt.verify(token, JWT_SECRET); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') ?? 'pending';

    try {
        const requests = await getPaymentRequests(status === 'all' ? undefined : { status });
        return NextResponse.json({ requests });
    } catch (err: any) {
        console.error('[admin/payments] GET error:', err);
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

        if (!requestId || !['approve', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        // Fetch the payment request
        const prSnap = await db.collection(COLLECTIONS.PAYMENT_REQUESTS).doc(requestId).get();
        if (!prSnap.exists) {
            return NextResponse.json({ error: 'Payment request not found' }, { status: 404 });
        }

        const pr = prSnap.data()!;
        if (pr.status !== 'pending') {
            return NextResponse.json({ error: `Request already ${pr.status}` }, { status: 409 });
        }

        const newStatus = action === 'approve' ? 'approved' : 'rejected';

        await updatePaymentRequest(requestId, {
            status: newStatus,
            adminNotes: adminNotes ?? null,
            reviewedAt: Timestamp.now(),
        });

        // If approved → upgrade user tier
        if (action === 'approve') {
            const quizzes = PLAN_CONFIG[pr.tier]?.quizzes ?? 3;
            await updateUser(pr.userId, {
                subscriptionTier: pr.tier as any,
                quizzesRemaining: quizzes,
            });
        }

        return NextResponse.json({ success: true, status: newStatus });
    } catch (err: any) {
        console.error('[admin/payments] PATCH error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
