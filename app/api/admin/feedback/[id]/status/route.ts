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
        const { status } = body;

        if (!['open', 'in_progress', 'resolved'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const docRef = db.collection(COLLECTIONS.FEEDBACKS).doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        await docRef.update({
            status,
            updatedAt: new Date() as any
        });

        return NextResponse.json({ success: true, status });
    } catch (error: any) {
        console.error('Error updating feedback status:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
