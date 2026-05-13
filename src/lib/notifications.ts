/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getToken, onMessage } from 'firebase/messaging';
import { getMessagingInstance, db } from './firebase';
import { doc, setDoc, arrayUnion } from 'firebase/firestore';

const VAPID_KEY = 'BAkQLF4_AddaRBbYyYlRIXK4RzVpKXruI8H4m7gYt-deu2crBG_8TjFpwrbkago89tcDfGkOl7tjsmvRGVNvs_c';

export async function requestNotificationPermission(userId: string) {
  if (!('Notification' in window)) {
    throw new Error('This browser does not support notifications.');
  }

  try {
    // 1. Request Permission IMMEDIATELY (must be direct result of user gesture)
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission === 'denied') {
      throw new Error('Notification permission denied. If you are in Incognito/Private mode, please switch to a normal tab. Otherwise, reset permissions in your browser settings.');
    }

    if (permission !== 'granted') {
      return null;
    }

    // 2. Only after permission is granted, proceed with background work
    const messaging = await getMessagingInstance();
    if (!messaging) {
      throw new Error('Push messaging is not supported on this browser or environment.');
    }

    // 3. Register Service Worker
    let registration;
    if ('serviceWorker' in navigator) {
      registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/'
      });
      await navigator.serviceWorker.ready;
    } else {
      throw new Error('Service Workers are not supported.');
    }

    // 4. Get Token
    const token = await getToken(messaging, { 
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (token) {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        fcmTokens: arrayUnion(token),
        lastTokenUpdate: new Date().toISOString()
      }, { merge: true });
      return token;
    } else {
      throw new Error('Could not retrieve push token.');
    }
  } catch (error: any) {
    console.error('Notification Error:', error);
    throw error;
  }
}

export async function onForegroundMessage() {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    
    // Display a custom notification using the browser API or a toast
    if (payload.notification) {
      new Notification(payload.notification.title || 'New Message', {
        body: payload.notification.body,
        icon: payload.notification.icon,
      });
    }
  });
}
