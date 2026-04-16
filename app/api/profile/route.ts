import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUserById, updateUser, getAllUserProgress } from '@/lib/firebase/db';
import type { UserDoc } from '@/lib/firebase/collections';

/**
 * Calculate profile completion percentage based on filled fields.
 */
function calcProfileCompletion(user: Partial<UserDoc>): number {
    const checks = [
        !!user.name,
        !!user.phone,
        !!user.city,
        !!user.headline,
        !!user.profilePhotoUrl,

        !!(user.workExperience && user.workExperience.length > 0),
        !!(user.educationDetails && (user.educationDetails as any)?.degree),
        !!(user.toolStack && user.toolStack.length > 0),
        !!(user.certifications && user.certifications.length > 0),
        !!user.linkedinUrl,
    ];
    const filled = checks.filter(Boolean).length;
    return Math.round((filled / checks.length) * 100);
}

/**
 * GET /api/profile — Get authenticated user's full profile
 */
export async function GET() {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const fullUser = await getUserById(user.id);
        if (!fullUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Fetch quiz stats
        const progress = await getAllUserProgress(user.id);
        const totalAttempted = progress.reduce((sum, p) => sum + p.totalAttempted, 0);
        const totalCorrect = progress.reduce((sum, p) => sum + p.totalCorrect, 0);
        const accuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

        return NextResponse.json({
            profile: {
                id: fullUser.id,
                email: fullUser.email,
                name: fullUser.name ?? null,
                phone: fullUser.phone ?? null,
                city: fullUser.city ?? null,
                headline: fullUser.headline ?? null,
                profilePhotoUrl: fullUser.profilePhotoUrl ?? null,
                profileType: fullUser.profileType ?? null,
                experienceYears: fullUser.experienceYears ?? null,

                educationDetails: fullUser.educationDetails ?? null,
                toolStack: fullUser.toolStack ?? null,
                workExperience: fullUser.workExperience ?? [],
                certifications: fullUser.certifications ?? [],
                linkedinUrl: fullUser.linkedinUrl ?? null,
                githubUrl: fullUser.githubUrl ?? null,
                subscriptionTier: fullUser.subscriptionTier,
                quizzesRemaining: fullUser.quizzesRemaining,
                profileCompletionPct: calcProfileCompletion(fullUser),
                createdAt: fullUser.createdAt,
            },
            stats: {
                totalAttempted,
                totalCorrect,
                accuracy,
                quizzesTaken: progress.length > 0 ? totalAttempted : 0,
                topSkill: progress.length > 0
                    ? progress.reduce((best, p) => p.accuracy > best.accuracy ? p : best, progress[0]).skill
                    : null,
            },
        });
    } catch (error: any) {
        console.error('Profile GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * PATCH /api/profile — Update authenticated user's profile
 *
 * Body: partial profile fields to update
 */
export async function PATCH(request: Request) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        // Whitelist editable fields
        const allowedFields = [
            'name', 'phone', 'city', 'headline',
            'profileType', 'experienceYears',
            'educationDetails', 'toolStack',
            'workExperience', 'certifications',
            'linkedinUrl', 'githubUrl',
            'quizGoal', 'upcomingCompany', 'upcomingJD',
        ];

        const updates: Partial<UserDoc> = {};
        for (const field of allowedFields) {
            if (field in body) {
                (updates as any)[field] = body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        // Calculate new completion percentage
        const currentUser = await getUserById(user.id);
        const merged = { ...currentUser, ...updates };
        updates.profileCompletionPct = calcProfileCompletion(merged as any);

        await updateUser(user.id, updates);

        return NextResponse.json({ success: true, profileCompletionPct: updates.profileCompletionPct });
    } catch (error: any) {
        console.error('Profile PATCH error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
