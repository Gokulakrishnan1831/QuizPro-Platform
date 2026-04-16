/**
 * lib/firebase/client.ts
 *
 * Client-side Firebase SDK singleton for browser use.
 * Exports `app`, `auth`, and `storage` for client-side usage.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebasestorage.app`,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

/** Client-side Firebase Auth instance */
export const auth = getAuth(app);

export const storage = getStorage(app);

export const db = getFirestore(app);

export { googleProvider };

export default app;
