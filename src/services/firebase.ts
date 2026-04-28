import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, Auth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, Firestore } from 'firebase/firestore';
import configAI from '../../firebase-applet-config.json';

// Standard VITE env vars (Production/Vercel)
const envConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)'
};

// Use environment config if available, otherwise fallback to AI Studio config
const finalConfig = envConfig.apiKey ? envConfig : configAI;

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

try {
    app = !getApps().length ? initializeApp(finalConfig) : getApps()[0];
    db = getFirestore(app, (finalConfig as any).firestoreDatabaseId || '(default)');
    auth = getAuth(app);
} catch (e) {
    console.error("Firebase Initialization Failed:", e);
    // Dummy initialization for build
    // @ts-ignore
    app = {} as FirebaseApp;
    // @ts-ignore
    db = {} as Firestore;
    // @ts-ignore
    auth = { onAuthStateChanged: () => () => {} } as unknown as Auth;
}

export { app, db, auth };
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export async function testConnection() {
  try {
    if (!db.app) return;
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    console.warn("Firebase connection test warning:", error.message);
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
}
