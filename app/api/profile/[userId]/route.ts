import { NextResponse } from 'next/server';
import { getUserById, getAllUserProgress, getQuizAttemptsByUser } from '@/lib/firebase/db';

/**
 * GET /api/profile/[userId] — Public profile view
 *
 * Returns publicly-safe profile data with quiz stats.
 * Sensitive fields (full email, phone) are masked/hidden.
 */
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ userId: string }> },
) {
    try {
        const { userId } = await params;

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        const user = await getUserById(userId);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Mask email: "user@gmail.com" → "us•••@gmail.com"
        const emailParts = user.email.split('@');
        const namePart = emailParts[0] ?? '';
        const maskedEmail = namePart.length > 2
            ? namePart.slice(0, 2) + '•••@' + (emailParts[1] ?? '')
            : '•••@' + (emailParts[1] ?? '');

        // Fetch quiz stats
        const progress = await getAllUserProgress(userId);
        const totalAttempted = progress.reduce((sum, p) => sum + p.totalAttempted, 0);
        const totalCorrect = progress.reduce((sum, p) => sum + p.totalCorrect, 0);
        const accuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;
        const attempts = await getQuizAttemptsByUser(userId, 100);

        return NextResponse.json({
            profile: {
                id: user.id,
                name: user.name ?? 'Anonymous',
                email: maskedEmail,
                city: user.city ?? null,
                headline: user.headline ?? null,
                profilePhotoUrl: user.profilePhotoUrl ?? null,
                profileType: user.profileType ?? null,
                experienceYears: user.experienceYears ?? null,
                workExperience: user.workExperience ?? [],
                educationDetails: user.educationDetails ?? null,
                toolStack: user.toolStack ?? [],
                certifications: user.certifications ?? [],
                linkedinUrl: user.linkedinUrl ?? null,
                githubUrl: user.githubUrl ?? null,

                createdAt: user.createdAt,
            },
            stats: {
                totalAttempted,
                totalCorrect,
                accuracy,
                quizzesTaken: attempts.length,
                topSkill: progress.length > 0
                    ? progress.reduce((best, p) => p.accuracy > best.accuracy ? p : best, progress[0]).skill
                    : null,
                skillBreakdown: progress.map(p => ({
                    skill: p.skill,
                    accuracy: Math.round(Number(p.accuracy)),
                    totalAttempted: p.totalAttempted,
                })),
            },
        });
    } catch (error: any) {
        console.error('Public profile error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
