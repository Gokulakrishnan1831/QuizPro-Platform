import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ensureTables } from '@/lib/db-init';
import prisma from '@/lib/prisma';

const PLAN_CONFIG: Record<string, { price: number; name: string; quizzes: number }> = {
    BASIC: { price: 99, name: 'Basic', quizzes: 3 },
    PRO: { price: 299, name: 'Pro', quizzes: 10 },
    ELITE: { price: 499, name: 'Elite', quizzes: 20 },
};

/**
 * POST /api/subscriptions/request
 * Body: { tier, upiTransactionId, screenshotBase64? }
 *
 * Creates a pending payment request that admin will approve.
 */
export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

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

        await ensureTables();
        const db = prisma as any;

        // Check if user already has a pending request for this tier
        const existing = await db.$queryRawUnsafe(
            `SELECT id FROM "PaymentRequest"
       WHERE user_id = $1 AND tier = $2 AND status = 'pending'
       LIMIT 1`,
            user.id, tier
        );

        if (existing.length > 0) {
            return NextResponse.json(
                { error: 'You already have a pending payment request for this tier. Please wait for admin approval.' },
                { status: 409 }
            );
        }

        // Store the payment request
        const result = await db.$queryRawUnsafe(
            `INSERT INTO "PaymentRequest"
         (user_id, user_email, user_name, tier, amount, upi_transaction_id, screenshot_base64)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
            user.id,
            user.email,
            user.user_metadata?.full_name ?? null,
            String(tier).toUpperCase(),
            plan.price,
            String(upiTransactionId).trim(),
            screenshotBase64 ?? null,
        );

        return NextResponse.json({
            success: true,
            requestId: result[0]?.id,
            message: `Payment request submitted for ${plan.name} plan. Admin will verify and upgrade your account within 24 hours.`,
        });
    } catch (err: any) {
        console.error('[subscriptions/request] error:', err);
        return NextResponse.json({ error: 'Failed to submit payment request' }, { status: 500 });
    }
}

/**
 * GET /api/subscriptions/request
 * Returns the current user's payment request history.
 */
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await ensureTables();
        const db = prisma as any;

        const requests = await db.$queryRawUnsafe(
            `SELECT id, tier, amount, upi_transaction_id, status, admin_notes, created_at, reviewed_at
       FROM "PaymentRequest"
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
            user.id
        );

        return NextResponse.json({ requests });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
