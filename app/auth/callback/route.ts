import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';

/**
 * Handles the OAuth callback from Supabase (Google, etc.).
 * Exchanges the auth code for a session, then ensures a matching
 * row exists in the Prisma User table.
 */
export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const redirectTo = searchParams.get('redirect') || '/dashboard';

    if (code) {
        const supabase = await createClient();
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error && data.user) {
            // Upsert the user into our Prisma DB so the rest of the app can query it
            await prisma.user.upsert({
                where: { id: data.user.id },
                update: { email: data.user.email! },
                create: {
                    id: data.user.id,
                    email: data.user.email!,
                    name:
                        data.user.user_metadata?.full_name ||
                        data.user.user_metadata?.name ||
                        null,
                    subscriptionTier: 'FREE',
                    quizzesRemaining: 1,
                },
            });

            return NextResponse.redirect(`${origin}${redirectTo}`);
        }
    }

    // Auth code exchange failed – send the user to login with an error hint
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
