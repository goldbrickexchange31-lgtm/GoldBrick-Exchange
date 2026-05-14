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
3. Once in a new tab, wait 5-10 seconds for the browser to detect the PWA. The "Install App" button should then appear in the header.
4. Click the "Install App" button. If supported, you will see the native Chrome/Android install popup.
5. If the app is already installed, the button will be hidden automatically.

## 6. Troubleshooting PWA Install
- **Iframe Restriction**: The native install prompt will NOT trigger inside the AI Studio preview frame. You MUST use the "Open in new tab" icon.
- **Service Worker**: Check Chrome DevTools -> Application -> Service Workers. It should show `/service-worker.js` as active and running.
- **Manifest**: Check Chrome DevTools -> Application -> Manifest. There should be no errors.
- **Security Check**: Chrome requires a valid HTTPS certificate and no manifest errors for the prompt to fire.
