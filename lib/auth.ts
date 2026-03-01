import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';

/**
 * Resolves the current authenticated user from the Supabase session
 * and fetches their full profile from the Prisma User table.
 *
 * Returns `null` if not authenticated or if the user row doesn't exist.
 */
export async function getAuthenticatedUser() {
    const supabase = await createClient();
    const {
        data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) return null;

    const dbUser = await prisma.user.findUnique({
        where: { id: authUser.id },
    });

    return dbUser;
}
