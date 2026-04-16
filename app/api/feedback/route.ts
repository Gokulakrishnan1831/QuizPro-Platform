import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { db } from '@/lib/firebase/admin';
import { COLLECTIONS, FeedbackDoc } from '@/lib/firebase/collections';
import { FieldValue } from 'firebase-admin/firestore';

export async function GET(request: Request) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const snapshot = await db.collection(COLLECTIONS.FEEDBACKS)
            .where('userId', '==', user.id)
            .get();

        const feedbacks = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a: any, b: any) => {
                const aTime = a.createdAt?._seconds || Date.now() / 1000;
                const bTime = b.createdAt?._seconds || Date.now() / 1000;
                return bTime - aTime;
            });

        return NextResponse.json({ feedbacks });
    } catch (error: any) {
        console.error('Error fetching feedbacks:', error);
        return NextResponse.json({ error: 'Failed to fetch feedbacks' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { subject, body: messageBody, category } = body;

        if (!subject || !messageBody || !category) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const docRef = db.collection(COLLECTIONS.FEEDBACKS).doc();
        const newFeedback: FeedbackDoc = {
            id: docRef.id,
            userId: user.id,
            userEmail: user.email,
            userName: user.name || user.email.split('@')[0],
            subject,
            body: messageBody,
            category,
            status: 'open',
            isReadByAdmin: false,
            replies: [],
            createdAt: FieldValue.serverTimestamp() as any, // Cast to any to bypass TS error, actual Timestamp is generated server side
            updatedAt: FieldValue.serverTimestamp() as any,
        };

        await docRef.set(newFeedback);

        return NextResponse.json({ feedback: newFeedback });
    } catch (error: any) {
        console.error('Error creating feedback:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
