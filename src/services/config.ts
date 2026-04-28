// Safely load firebase config
let config: any = null;

try {
  // @ts-ignore
  import configJSON from '../../firebase-applet-config.json';
  config = configJSON;
} catch (e) {
  // Fallback to env vars
  if (import.meta.env.VITE_FIREBASE_API_KEY) {
    config = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
        firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)'
    };
  }
}

export default config;
