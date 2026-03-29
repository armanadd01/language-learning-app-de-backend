import admin from 'firebase-admin';

import { env } from './env';

let app: admin.app.App | null = null;

function parseServiceAccount(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON');
  }

  // Vercel env vars often break when pasting multi-line JSON/private keys.
  // Support either raw JSON or base64-encoded JSON.
  const asJson = trimmed.startsWith('{') ? trimmed : Buffer.from(trimmed, 'base64').toString('utf8');
  return JSON.parse(asJson);
}

export function getFirebaseAdminApp() {
  if (app) return app;

  const raw = env.FIREBASE_SERVICE_ACCOUNT_JSON;
  try {
    const serviceAccount = parseServiceAccount(raw);
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
    return app;
  } catch (err) {
    throw new Error(
      'Invalid FIREBASE_SERVICE_ACCOUNT_JSON (must be valid JSON or base64-encoded JSON)'
    );
  }
}

export async function verifyFirebaseIdToken(idToken: string) {
  getFirebaseAdminApp();
  return admin.auth().verifyIdToken(idToken);
}
