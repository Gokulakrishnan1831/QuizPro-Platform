import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { db } from '@/lib/firebase/admin';
import { COLLECTIONS, NotificationDoc } from '@/lib/firebase/collections';

export async function GET(request: Request) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const snapshot = await db.collection(COLLECTIONS.NOTIFICATIONS)
            .where('userId', '==', user.id)
            .get();

        let notifications = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                // Make sure timestamp is serializable to JSON
                createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : null
            };
        });

        // Sort by createdAt descending in memory to bypass Firebase Index requirement
        notifications.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
        });

        // Limit to 50
        notifications = notifications.slice(0, 50);

        return NextResponse.json({ notifications });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
