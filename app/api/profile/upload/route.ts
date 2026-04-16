import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { updateUser } from '@/lib/firebase/db';
import { db } from '@/lib/firebase/admin';
import { getStorage } from 'firebase-admin/storage';

const MAX_PHOTO_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * POST /api/profile/upload
 *
 * Upload a profile photo to Firebase Storage.
 * Body: multipart/form-data with `file` and `type` (photo)
 * Returns: { url: string }
 */
export async function POST(request: Request) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const uploadType = formData.get('type') as string | null;

        if (!file || !uploadType) {
            return NextResponse.json(
                { error: 'file and type are required' },
                { status: 400 },
            );
        }

        if (uploadType !== 'photo') {
            return NextResponse.json(
                { error: 'type must be "photo"' },
                { status: 400 },
            );
        }

        // Validate file size
        if (file.size > MAX_PHOTO_SIZE) {
            return NextResponse.json(
                { error: 'File too large. Max 2MB for photos.' },
                { status: 400 },
            );
        }

        // Validate MIME type
        if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: `Invalid file type. Allowed: ${ALLOWED_PHOTO_TYPES.join(', ')}` },
                { status: 400 },
            );
        }

        // Generate storage path
        const ext = file.name.split('.').pop() || 'jpg';
        const timestamp = Date.now();
        const storagePath = `users/${user.id}/photo/${timestamp}.${ext}`;

        // Upload to Firebase Storage
        const bucket = getStorage().bucket();
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const fileRef = bucket.file(storagePath);

        await fileRef.save(fileBuffer, {
            metadata: {
                contentType: file.type,
                metadata: {
                    uploadedBy: user.id,
                    originalName: file.name,
                },
            },
        });

        // Make publicly accessible
        await fileRef.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

        // Update Firestore
        await updateUser(user.id, { profilePhotoUrl: publicUrl });

        return NextResponse.json({ url: publicUrl });
    } catch (error: any) {
        console.error('Profile upload error:', error);
        return NextResponse.json(
            { error: error.message || 'Upload failed' },
            { status: 500 },
        );
    }
}
