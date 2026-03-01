import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';
import { getUserById } from '@/lib/firebase/db';

/**
 * Resolves the current authenticated user from the Firebase session cookie
 * and fetches their full profile from Firestore.
 *
 * Returns `null` if not authenticated or if the user doc doesn't exist.
 */
export async function getAuthenticatedUser() {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('__session')?.value;

    if (!sessionCookie) return null;

    try {
        const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
        const dbUser = await getUserById(decoded.uid);
        return dbUser;
    } catch {
        return null;
    }
}
