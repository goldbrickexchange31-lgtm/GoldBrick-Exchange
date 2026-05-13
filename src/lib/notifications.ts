/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getToken, onMessage } from 'firebase/messaging';
import { getMessagingInstance, db } from './firebase';
import { doc, setDoc, arrayUnion } from 'firebase/firestore';

const VAPID_KEY = 'BAkQLF4_AddaRBbYyYlRIXK4RzVpKXruI8H4m7gYt-deu2crBG_8TjFpwrbkago89tcDfGkOl7tjsmvRGVNvs_c';

export async function requestNotificationPermission(userId: string) {
  const messaging = await getMessagingInstance();
  if (!messaging) {
    throw new Error('Push messaging is not supported on this browser or context (iframes are blocked).');
  }

  try {
    // 1. Register Service Worker explicitly
    let registration;
    if ('serviceWorker' in navigator) {
      registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/'
      });
      console.log('Service Worker registered:', registration.scope);
      // Wait for it to be active
      await navigator.serviceWorker.ready;
    } else {
      throw new Error('Service Workers are not supported in this browser.');
    }

    // 2. Request Permission
    const permission = await Notification.requestPermission();
    if (permission === 'denied') {
      throw new Error('Notification permission denied. Please reset permissions in your browser settings.');
    }
    
    if (permission === 'granted') {
      // 3. Get Token
      const token = await getToken(messaging, { 
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration
      });

      if (token) {
        console.log('FCM Token Generated:', token);
        // Store the token in the user's profile using setDoc merge to ensure it works even if doc doesn't exist
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, {
          fcmTokens: arrayUnion(token),
          lastTokenUpdate: new Date().toISOString()
        }, { merge: true });
        return token;
      } else {
        throw new Error('Handshake failed: No token retrieved.');
      }
    }
  } catch (error: any) {
    console.error('Error in requestNotificationPermission:', error);
    throw error;
  }
  return null;
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
