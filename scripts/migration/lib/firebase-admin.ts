import * as admin from 'firebase-admin';
import * as path from 'path';

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';
const resolvedPath = path.resolve(__dirname, '..', serviceAccountPath);

// eslint-disable-next-line @typescript-eslint/no-var-requires
const serviceAccount = require(resolvedPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const firestore = admin.firestore();
export const firebaseAuth = admin.auth();
export default admin;
