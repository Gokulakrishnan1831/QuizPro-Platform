import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * POST /api/auth/sync-profile
 *
 * Called after Supabase signup to persist the user's profile (persona,
 * experience, name, profileType, education, resume, etc.) into the
 * Prisma User table. The row is upserted so that calling this endpoint
 * is idempotent.
 *
 * Gracefully degrades: if the new columns (profileType, toolStack, etc.)
 * haven't been migrated yet, falls back to core fields only.
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

        const db = prisma as any;

        // ── Attempt 1: Full upsert with all new fields ──────────────────
        try {
            const user = await db.user.upsert({
                where: { id },
                update: {
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
                    interviewDate: interviewDate ? new Date(interviewDate) : null,
                },
                create: {
                    id,
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
                    interviewDate: interviewDate ? new Date(interviewDate) : null,
                    subscriptionTier: 'FREE',
                    quizzesRemaining: 1,
                },
            });

            return NextResponse.json({ user }, { status: 200 });
        } catch (fullErr: any) {
            // If the error is about unknown fields, fall back to core fields
            if (
                fullErr?.message?.includes('Unknown argument') ||
                fullErr?.message?.includes('Unknown field') ||
                fullErr?.code === 'P2009'
            ) {
                console.warn(
                    'sync-profile: New fields not yet migrated, falling back to core fields.',
                    fullErr.message,
                );
            } else {
                // Re-throw non-schema errors (e.g. connection issues)
                throw fullErr;
            }
        }

        // ── Attempt 2: Core fields only (pre-migration fallback) ────────
        const user = await db.user.upsert({
            where: { id },
            update: {
                email,
                name: name || null,
                persona: persona || null,
                experienceYears: experienceYears ?? null,
            },
            create: {
                id,
                email,
                name: name || null,
                persona: persona || null,
                experienceYears: experienceYears ?? null,
                subscriptionTier: 'FREE',
                quizzesRemaining: 1,
            },
        });

        return NextResponse.json({ user, migrationPending: true }, { status: 200 });
    } catch (error: any) {
        console.error('sync-profile error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 },
        );
    }
}
