import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'UNKNOWN',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'UNKNOWN',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'UNKNOWN',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'UNKNOWN',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? 'UNKNOWN',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? 'UNKNOWN',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? 'UNKNOWN',
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID ?? undefined,
};

function isValidConfig(config: Record<string, unknown>) {
  return (
    typeof config.apiKey === 'string' && config.apiKey !== 'UNKNOWN' && config.apiKey.length > 10 &&
    typeof config.projectId === 'string' && config.projectId !== 'UNKNOWN'
  );
}

const firebaseEnabled = isValidConfig(firebaseConfig);
let app: ReturnType<typeof initializeApp> | null = null;
let firestoreDb: ReturnType<typeof getFirestore> | null = null;
let authInstance: ReturnType<typeof getAuth> | null = null;

if (firebaseEnabled) {
  app = initializeApp(firebaseConfig);
  authInstance = getAuth();
  // @ts-ignore
  firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const db = firestoreDb;
export const auth = authInstance;
export const isFirebaseEnabled = firebaseEnabled;

async function testConnection() {
  if (!firebaseEnabled || !firestoreDb) {
    console.warn('Firebase disabled or using placeholder config. Skipping connection test.');
    return;
  }

  try {
    const testDoc = doc(firestoreDb, 'global', 'state');
    await getDocFromServer(testDoc);
    console.log('Firebase connection established');
  } catch (error) {
    console.error('Firebase connection error:', error);
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration or network status.');
    }
  }
}

testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  const errorMsg = JSON.stringify(errInfo);
  console.error('Firestore Error: ', errorMsg);
  throw new Error(errorMsg);
}
