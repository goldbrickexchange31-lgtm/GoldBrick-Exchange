/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyASBcntcqxMiVjX6VngCbO6TqUPXFXfgCk",
  authDomain: "goldbrick-cd2b5.firebaseapp.com",
  projectId: "goldbrick-cd2b5",
  storageBucket: "goldbrick-cd2b5.firebasestorage.app",
  messagingSenderId: "390165274318",
  appId: "1:390165274318:web:1dc2018ed92d4dc0a77a9f",
  measurementId: "G-S9KR91XEC8"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;
export default app;
