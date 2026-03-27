import admin from 'firebase-admin';

import { env } from './env';

let app: admin.app.App | null = null;

export function getFirebaseAdminApp() {
  if (app) return app;

  const raw = env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON');
  }
  try {
    const serviceAccount = JSON.parse(raw);
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
    return app;
  } catch (err) {
    throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON (must be valid JSON)');
  }
}

export async function verifyFirebaseIdToken(idToken: string) {
  getFirebaseAdminApp();
  return admin.auth().verifyIdToken(idToken);
}
