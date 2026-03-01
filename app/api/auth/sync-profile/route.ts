import { NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { upsertUser } from '@/lib/firebase/db';

/**
 * POST /api/auth/sync-profile
 *
 * Called after signup to persist the user's full profile into Firestore.
 * Upserts so it's idempotent.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            id,
            email,
            name,
            persona,
            experienceYears,
            profileType,
            resumeUrl,
            educationDetails,
            toolStack,
            quizGoal,
            upcomingCompany,
            upcomingJD,
            interviewDate,
            subscriptionTier,
            quizzesRemaining,
        } = body;

        if (!id || !email) {
            return NextResponse.json(
                { error: 'id and email are required' },
                { status: 400 },
            );
        }

        // Users always start on FREE tier.
        // Paid plans (BASIC, PRO, ELITE) only activate after admin approves the payment.
        const requestedTier = subscriptionTier || 'FREE';
        const isPaidPlan = requestedTier !== 'FREE';

        await upsertUser(id, {
            email,
            name: name || null,
            persona: persona || null,
            experienceYears: experienceYears ?? null,
            profileType: profileType || null,
            resumeUrl: resumeUrl || null,
            educationDetails: educationDetails || null,
            toolStack: toolStack || null,
            quizGoal: quizGoal || null,
            upcomingCompany: upcomingCompany || null,
            upcomingJD: upcomingJD || null,
            interviewDate: interviewDate ? Timestamp.fromDate(new Date(interviewDate)) : null,
            subscriptionTier: 'FREE',
            quizzesRemaining: 1,
            ...(isPaidPlan ? { requestedTier } : {}),
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: any) {
        console.error('sync-profile error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 },
        );
    }
}
