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

const app =
    getApps().length === 0
        ? initializeApp({ credential: cert(getServiceAccount()) })
        : getApps()[0]!;

/** Firestore database instance */
export const db = getFirestore(app);

/** Firebase Auth admin instance */
export const adminAuth = getAuth(app);
