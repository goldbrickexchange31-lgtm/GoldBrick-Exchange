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
- The file `/public/service-worker.js` is the entry point for background notifications and PWA functionality.
- Do NOT rename this file, as the app depends on it for installability and push alerts.
- If you change the Firebase config in the app, also update it at the top of this file.

## 4. Admin Setup
- When you first visit the Admin Dashboard, your browser will ask for notification permission.
- **Click Allow.**
- If you don't see the prompt, click the **"Sync Push Device"** button in the Admin Settings section.
- This will save your device token to the database, allowing the server to send you alerts.

## 5. Testing the PWA
1. Ensure you have added the `VITE_FIREBASE_VAPID_KEY` to your secrets/env.
2. **IMPORTANT**: Open the site in a **new tab/browser window**. The AI Studio iframe blocks the native "Install App" prompt.
3. Once in a new tab, the browser will analyze your site. This can take 5-30 seconds.
4. The "**⬇ Install App**" button will appear in the dashboard header (on desktop) or as a floating button (on mobile) as soon as the browser confirms the app is installable.
5. Click the button to trigger the native Chrome/Android install popup.

## 6. Troubleshooting
- If the button doesn't show:
  - You might already have the app installed.
  - You are using an unsupported browser (Firefox/Safari don't support `beforeinstallprompt`).
  - You are still inside the AI Studio iframe (Use the "Open in new tab" icon).
  - Open Chrome DevTools -> Application -> Manifest to check for any red errors.
  - Check Chrome DevTools -> Application -> Service Workers. It should show `/service-worker.js` as active and running.
