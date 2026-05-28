/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, Firestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Detect whether the user has integrated Firebase
const isFirebaseConfigured = !!(firebaseConfig && firebaseConfig.apiKey);

let app;
let db: Firestore | null = null;
let auth: Auth | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
    auth = getAuth(app);
    
    // Test connection on startup per Firebase skill guidelines
    getDocFromServer(doc(db, 'test', 'connection')).catch((error) => {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.warn("Conexão inicial com Firebase offline:", error.message);
      }
    });
  } catch (err) {
    console.error('Erro ao inicializar os serviços do Firebase:', err);
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
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const current_auth = auth;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: current_auth?.currentUser?.uid || null,
      email: current_auth?.currentUser?.email || null,
      emailVerified: current_auth?.currentUser?.emailVerified || null,
      isAnonymous: current_auth?.currentUser?.isAnonymous || null,
      tenantId: current_auth?.currentUser?.tenantId || null,
      providerInfo: current_auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function cleanDocument<T extends object>(obj: T): T {
  const cleaned = {} as any;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = obj[key];
      if (val !== undefined && val !== null) {
        // If nested object (not Array or Date), serialize or clean it too
        if (typeof val === 'object' && val !== null && !Array.isArray(val) && !(val instanceof Date)) {
          cleaned[key] = cleanDocument(val);
        } else {
          cleaned[key] = val;
        }
      }
    }
  }
  return cleaned;
}

export { db, auth, isFirebaseConfigured, GoogleAuthProvider, signInWithPopup, signOut };
