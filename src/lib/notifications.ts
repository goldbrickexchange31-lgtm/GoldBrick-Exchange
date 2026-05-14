/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getToken, onMessage } from 'firebase/messaging';
import { getMessagingInstance, db } from './firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { toast } from 'sonner';

// @ts-ignore - import.meta.env is provided by Vite
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || 'BAkQLF4_AddaRBbYyYlRIXK4RzVpKXruI8H4m7gYt-deu2crBG_8TjFpwrbkago89tcDfGkOl7tjsmvRGVNvs_c';

export async function requestNotificationPermission(userId: string) {
  if (typeof window === 'undefined') return null;
  
  const messaging = await getMessagingInstance();
  if (!messaging) {
    console.warn('FCM: Messaging is not supported on this browser/environment.');
    return null;
  }

  try {
    // 1. Explicitly Register Service Worker for FCM
    let registration: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/'
      });
      console.log('FCM: Service Worker registered:', registration.scope);
      // Wait for it to be active to avoid "missing service worker" errors
      await navigator.serviceWorker.ready;
    }

    // 2. Request Browser Permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('FCM: Notification permission was not granted:', permission);
      return null;
    }

    // 3. Retrieve FCM Token
    const token = await getToken(messaging, { 
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (token) {
      console.log('FCM: Token acquired:', token);
      
      // 4. Store/Sync token in user's profile
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(token),
        notificationsEnabled: true,
        lastTokenSync: new Date()
      }).catch(err => {
        console.error('FCM: Failed to update user profile with token:', err);
      });
      
      return token;
    }
  } catch (error) {
    console.error('FCM: Error in setup flow:', error);
  }
  return null;
}

export async function onForegroundMessage() {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};

  // Handle messages when the tab is currently open (foreground)
  return onMessage(messaging, (payload) => {
    console.log('FCM: Foreground message received:', payload);
    
    // Show a high-visibility toast instead of a native notification 
    // because native notifications often don't show when the browser is focused.
    if (payload.notification) {
      toast.info(payload.notification.title || 'New Alert', {
        description: payload.notification.body,
        duration: 10000,
        action: payload.data?.link ? {
          label: 'Open',
          onClick: () => window.focus()
        } : undefined
      });
    }
  });
}
