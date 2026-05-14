# GoldBrick PWA & Push Notifications Setup Guide

To ensure everything works perfectly in production, follow these steps:

## 1. Firebase Console Configuration
1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Select your project: **goldbrick-cd2b5**.
3. Go to **Project Settings** (gear icon) -> **Cloud Messaging**.
4. Scroll down to **Web configuration** -> **Web Push certificates**.
5. Click **Generate Key Pair** if you haven't already.
6. Copy the **Key pair** (this is your **VAPID Key**).
7. Add this key to your environment variables as `VITE_FIREBASE_VAPID_KEY`.

## 2. HTTPS Requirements
- PWA and Push Notifications **require** a secure HTTPS connection.
- Browsers will block service workers and notification permissions on insecure `http://` sites (except localhost).

## 3. Service Worker Handling
- The file `/public/firebase-messaging-sw.js` is the entry point for background notifications.
- Do NOT rename this file, as Firebase looks for it by default.
- If you change the Firebase config in the app, also update it at the top of this file.

## 4. Admin Setup
- When you first visit the Admin Dashboard, your browser will ask for notification permission.
- **Click Allow.**
- If you don't see the prompt, click the **"Sync Push Device"** button in the Admin Settings section.
- This will save your device token to the database, allowing the server to send you alerts.

## 5. Testing
1. Ensure you have added the `VITE_FIREBASE_VAPID_KEY` to your secrets/env.
2. Open the site in a new tab (not in the AI Studio iframe for best results).
3. Check the "Install App" button in the header.
4. Try submitting a deposit as a test user and check if the admin receives a notification.
