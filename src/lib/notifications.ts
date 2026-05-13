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

  // Check if we are in an iframe (AI Studio preview)
  const isFramed = window.self !== window.top;

  try {
    // 1. Request Permission IMMEDIATELY (must be direct result of user gesture)
    let permission = Notification.permission;
    
    if (permission === 'default') {
      try {
        permission = await Notification.requestPermission();
      } catch (err) {
        permission = await new Promise((resolve) => {
          Notification.requestPermission(resolve as any);
        });
      }
    }

    if (permission === 'denied') {
      if (isFramed) {
        throw new Error('Notification permission is blocked by the frame. Please click the "Open in new tab" button at the top right of this preview to enable alerts.');
      }
      throw new Error('Notification permission is BLOCKED. To fix this: 1. Click the "Lock/Controls" icon next to the URL. 2. Toggle "Notifications" to ON. 3. Reload the page.');
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
