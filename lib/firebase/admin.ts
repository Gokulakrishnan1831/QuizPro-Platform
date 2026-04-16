/**
 * lib/firebase/admin.ts
 *
 * Server-side Firebase Admin SDK singleton.
 * Provides Firestore (`db`) and Firebase Auth (`adminAuth`) for API routes.
 */

import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as fs from 'fs';
import * as path from 'path';

function getServiceAccount(): ServiceAccount {
    const envPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (envPath) {
        const resolved = path.resolve(envPath);
        const raw = fs.readFileSync(resolved, 'utf-8');
        return JSON.parse(raw) as ServiceAccount;
    }

    const envJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (envJson) {
        return JSON.parse(envJson) as ServiceAccount;
    }

    throw new Error(
        'Missing Firebase service account. Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT env var.',
    );
}

function getStorageBucket(): string {
    if (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) {
        return process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    }
    // Derive from project ID
    const projectId =
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
        (getServiceAccount() as any).project_id;
    return `${projectId}.appspot.com`;
}

const app =
    getApps().length === 0
        ? initializeApp({
              credential: cert(getServiceAccount()),
              storageBucket: getStorageBucket(),
          })
        : getApps()[0]!;

/** Firestore database instance */
export const db = getFirestore(app);

/** Firebase Auth admin instance */
export const adminAuth = getAuth(app);
