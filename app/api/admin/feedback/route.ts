import { NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth';
import { db } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';

export async function GET(request: Request) {
    try {
        const adminUser = await getAuthenticatedAdmin();
        if (!adminUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        let query: FirebaseFirestore.Query = db.collection(COLLECTIONS.FEEDBACKS);

        if (status && status !== 'all') {
            query = query.where('status', '==', status);
        }

        const snapshot = await query.get();

        const feedbacks = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Descending order to show newest feedback first (sorted locally to avoid composite index requirement)
        feedbacks.sort((a: any, b: any) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?._seconds || 0) * 1000;
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?._seconds || 0) * 1000;
            return timeB - timeA;
        });

        // Calculate unread count globally to show badge
        const unreadQuery = db.collection(COLLECTIONS.FEEDBACKS).where('isReadByAdmin', '==', false);
        const unreadCountSnapshot = await unreadQuery.count().get();
        const unreadCount = unreadCountSnapshot.data().count;

        return NextResponse.json({ feedbacks, unreadCount });
    } catch (error: any) {
        console.error('Error fetching admin feedbacks:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
