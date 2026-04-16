import { NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth';
import { db } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';

export async function PATCH(
    request: Request,
    context: any
) {
    try {
        const { id } = await context.params;
        const adminUser = await getAuthenticatedAdmin();
        if (!adminUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { isReadByAdmin } = body;

        const docRef = db.collection(COLLECTIONS.FEEDBACKS).doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        await docRef.update({
            isReadByAdmin: Boolean(isReadByAdmin)
        });

        // Calculate unread count to return the updated badge count
        const unreadQuery = db.collection(COLLECTIONS.FEEDBACKS).where('isReadByAdmin', '==', false);
        const unreadCountSnapshot = await unreadQuery.count().get();
        const unreadCount = unreadCountSnapshot.data().count;

        return NextResponse.json({ success: true, isReadByAdmin, unreadCount });
    } catch (error: any) {
        console.error('Error updating feedback read status:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
