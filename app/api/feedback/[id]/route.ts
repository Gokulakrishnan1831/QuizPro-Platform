import { NextResponse } from 'next/server';
import { getAuthenticatedUser, getAuthenticatedAdmin } from '@/lib/auth';
import { db } from '@/lib/firebase/admin';
import { COLLECTIONS, FeedbackDoc } from '@/lib/firebase/collections';

export async function GET(
    request: Request,
    context: any
) {
    try {
        const { id } = await context.params;
        let user = await getAuthenticatedUser();
        const adminUser = await getAuthenticatedAdmin();

        if (!user && !adminUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Unify the entity into one variable for access rule checks below
        const actor = adminUser || user!;


        const docRef = db.collection(COLLECTIONS.FEEDBACKS).doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
        }

        const feedback = { id: docSnap.id, ...docSnap.data() } as FeedbackDoc;

        // Privacy check: only the owner or an admin can access this feedback thread.
        if (feedback.userId !== actor.id && actor.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json({ feedback });
    } catch (error: any) {
        console.error('Error fetching feedback thread:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
