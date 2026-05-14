/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Import and configure the Firebase SDK
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
  
  const notificationTitle = payload.notification?.title || 'GoldBrick Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'New update available on GoldBrick.',
    icon: payload.notification?.icon || '/og-image.png',
    badge: '/og-image.png',
    data: payload.data,
    vibrate: [200, 100, 200],
    tag: payload.data?.tag || 'default-tag'
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
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

// Generic PWA Caching
const CACHE_NAME = 'goldbrick-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let Firebase capture its own requests
  if (event.request.url.includes('firebaselogging.googleapis.com')) return;
  
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
