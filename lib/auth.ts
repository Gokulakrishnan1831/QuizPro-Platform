import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';
import { getUserById, getAdminById } from '@/lib/firebase/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'quizpro-admin-secret-key-change-in-production';

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

/**
 * Resolves the current authenticated admin from the admin JWT cookie.
 */
export async function getAuthenticatedAdmin() {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;

    if (!token) return null;

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { adminId: string; email: string };
        const admin = await getAdminById(decoded.adminId);
        return admin ? { ...admin, role: 'admin' as const } : null;
    } catch {
        return null;
    }
}
