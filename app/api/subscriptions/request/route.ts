import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { createPaymentRequest } from '@/lib/firebase/db';
import { db } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';

const PLAN_CONFIG: Record<string, { price: number; name: string; quizzes: number }> = {
    BASIC: { price: 99, name: 'Basic', quizzes: 3 },
    PRO: { price: 299, name: 'Pro', quizzes: 10 },
    ELITE: { price: 499, name: 'Elite', quizzes: 20 },
};

/**
 * POST /api/subscriptions/request
 * Body: { tier, upiTransactionId, screenshotBase64? }
 */
export async function POST(request: Request) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { tier, upiTransactionId, screenshotBase64 } = await request.json();

        const plan = PLAN_CONFIG[String(tier).toUpperCase()];
        if (!plan) {
            return NextResponse.json({ error: `Unknown tier: ${tier}` }, { status: 400 });
        }

        if (!upiTransactionId || String(upiTransactionId).trim().length < 6) {
            return NextResponse.json(
                { error: 'Please enter a valid UPI transaction ID (minimum 6 characters)' },
                { status: 400 }
            );
        }

        // Check for existing pending request
        const existingSnap = await db.collection(COLLECTIONS.PAYMENT_REQUESTS)
            .where('userId', '==', user.id)
            .where('tier', '==', String(tier).toUpperCase())
            .where('status', '==', 'pending')
            .limit(1)
            .get();

        if (!existingSnap.empty) {
            return NextResponse.json(
                { error: 'You already have a pending payment request for this tier. Please wait for admin approval.' },
                { status: 409 }
            );
        }

        const requestId = await createPaymentRequest({
            userId: user.id,
            userEmail: user.email,
            userName: user.name ?? null,
            tier: String(tier).toUpperCase(),
            amount: plan.price,
            upiTransactionId: String(upiTransactionId).trim(),
            screenshotBase64: screenshotBase64 ?? null,
        });

        return NextResponse.json({
            success: true,
            requestId,
            message: `Payment request submitted for ${plan.name} plan. Admin will verify and upgrade your account within 24 hours.`,
        });
    } catch (err: any) {
        console.error('[subscriptions/request] error:', err);
        return NextResponse.json({ error: 'Failed to submit payment request' }, { status: 500 });
    }
}

/**
 * GET /api/subscriptions/request
 */
export async function GET() {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const snap = await db.collection(COLLECTIONS.PAYMENT_REQUESTS)
            .where('userId', '==', user.id)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();

        const requests = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        return NextResponse.json({ requests });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
