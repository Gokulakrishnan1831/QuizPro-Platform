import { NextResponse } from 'next/server';
import { getAuthenticatedUser, getAuthenticatedAdmin } from '@/lib/auth';
import { db } from '@/lib/firebase/admin';
import { COLLECTIONS, FeedbackDoc, FeedbackReply } from '@/lib/firebase/collections';
import { FieldValue } from 'firebase-admin/firestore';
import { sendFeedbackReplyEmail } from '@/lib/email';
import { headers } from 'next/headers';

export async function POST(
    request: Request,
    context: any
) {
    try {
        const params = await context.params;
        const { id } = params;
        let user = await getAuthenticatedUser();
        const adminUser = await getAuthenticatedAdmin();

        if (!user && !adminUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const actor = adminUser || user!;


        const body = await request.json();
        const { body: replyBody } = body;

        if (!replyBody) {
            return NextResponse.json({ error: 'Missing reply body' }, { status: 400 });
        }

        const docRef = db.collection(COLLECTIONS.FEEDBACKS).doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
        }

        const feedback = { id: docSnap.id, ...docSnap.data() } as FeedbackDoc;

        // Privacy check
        if (feedback.userId !== actor.id && actor.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const isAdmin = actor.role === 'admin';
        const newReply: FeedbackReply = {
            id: db.collection('_').doc().id,
            authorId: actor.id,
            authorRole: isAdmin ? 'admin' : 'user',
            authorName: actor.name || actor.email.split('@')[0],
            body: replyBody,
            createdAt: new Date() as any // Storing Date inside Firestore arrays is standard since FieldValue works poorly here.
        };

        const updateData: Partial<FeedbackDoc> = {
            updatedAt: FieldValue.serverTimestamp() as any,
        };

        if (isAdmin) {
            updateData.status = 'in_progress';
            // Only toggle isReadByAdmin if somehow not handled
            updateData.isReadByAdmin = true;
        } else {
            // User replied, mark as unread for admin
            updateData.isReadByAdmin = false;
            updateData.status = 'in_progress';
        }

        await docRef.update({
            replies: FieldValue.arrayUnion(newReply),
            ...updateData
        });

        // If admin is replying, notify the user.
        if (isAdmin) {
            const headersList = await headers();
            const host = headersList.get('host') || 'preplytics.com';
            const protocol = host.includes('localhost') ? 'http' : 'https';
            const threadUrl = `${protocol}://${host}/feedback`;

            // Create Notification document
            const notificationRef = db.collection(COLLECTIONS.NOTIFICATIONS).doc();
            await notificationRef.set({
                id: notificationRef.id,
                userId: feedback.userId,
                title: 'New Reply Received',
                message: `Admin replied to your feedback: ${feedback.subject}`,
                type: 'feedback_reply',
                linkUrl: '/feedback', // Or specifically linking to a place where they expand it.
                isRead: false,
                createdAt: FieldValue.serverTimestamp()
            });

            await sendFeedbackReplyEmail(
                feedback.userEmail,
                feedback.userName,
                feedback.subject,
                replyBody,
                threadUrl
            );
        }

        return NextResponse.json({ reply: newReply });
    } catch (error: any) {
        console.error('Error adding reply:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
