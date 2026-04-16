import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { db } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';

export async function POST(
    request: Request,
    context: any
) {
    try {
        const params = await context.params;
        const { id } = params;
        const user = await getAuthenticatedUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const docRef = db.collection(COLLECTIONS.NOTIFICATIONS).doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
        }

        const notificationData = docSnap.data();
        if (notificationData?.userId !== user.id) {
             return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await docRef.update({
            isRead: true
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error marking notification as read:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
