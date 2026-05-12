/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Import and configure the Firebase SDK
// These scripts are made available when the app is served locally
importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyASBcntcqxMiVjX6VngCbO6TqUPXFXfgCk",
  authDomain: "goldbrick-cd2b5.firebaseapp.com",
  projectId: "goldbrick-cd2b5",
  storageBucket: "goldbrick-cd2b5.firebasestorage.app",
  messagingSenderId: "390165274318",
  appId: "1:390165274318:web:1dc2018ed92d4dc0a77a9f",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/logo.png', // Fallback to a default icon
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Try to find a window and focus it, or open a new one
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        if (clientList.length > 0) {
          let client = clientList[0];
          for (let i = 0; i < clientList.length; i++) {
            if (clientList[i].focused) {
              client = clientList[i];
            }
          }
          return client.focus();
        }
        return clients.openWindow('/');
      })
  );
});
