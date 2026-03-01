/**
 * lib/firebase/client.ts
 *
 * Client-side Firebase SDK singleton for browser use.
 * Exports `app` and `auth` for client-side authentication.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

/** Client-side Firebase Auth instance */
export const auth = getAuth(app);

export default app;
