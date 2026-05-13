import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import admin from 'firebase-admin';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase Config (Must match client)
const firebaseConfig = {
  projectId: "goldbrick-cd2b5",
  appId: "1:390165274318:web:1dc2018ed92d4dc0a77a9f",
  apiKey: "AIzaSyASBcntcqxMiVjX6VngCbO6TqUPXFXfgCk",
  authDomain: "goldbrick-cd2b5.firebaseapp.com",
  messagingSenderId: "390165274318",
};

// Initialize Admin SDK safely
let firebaseApp: admin.app.App | null = null;
let db: admin.firestore.Firestore | null = null;

function getDb() {
  if (db) return db;
  
  try {
    if (!admin.apps.length) {
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      
      if (serviceAccount) {
        console.log('[FIREBASE] Initializing with service account from ENV');
        const cert = JSON.parse(serviceAccount);
        firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(cert),
          projectId: firebaseConfig.projectId,
        });
      } else {
        console.log('[FIREBASE] Initializing with projectId (Falling back to default credentials)');
        firebaseApp = admin.initializeApp({
          projectId: firebaseConfig.projectId,
        });
      }
    } else {
      firebaseApp = admin.app();
    }

    db = admin.firestore(firebaseApp);
    // Remove the custom databaseId setting as it's not present in client config
    db.settings({
      ignoreUndefinedProperties: true
    });
    return db;
  } catch (error) {
    console.error('[FIREBASE] Admin initialization failed:', error);
    throw error;
  }
}

// Background Task: Mature Investments
async function matureInvestments() {
  try {
    const firestore = getDb();
    const invRef = firestore.collection('investments');
    const snap = await invRef.where('status', '==', 'active').get();

    for (const invDoc of snap.docs) {
      const inv = invDoc.data();
      
      // Get expiresAt from document
      let expiryDate: Date | null = null;
      if (inv.expiresAt) {
        if (typeof inv.expiresAt.toDate === 'function') {
          expiryDate = inv.expiresAt.toDate();
        } else if (inv.expiresAt._seconds) {
          expiryDate = new Date(inv.expiresAt._seconds * 1000);
        }
      }

      // Fallback to calculation if expiresAt is missing
      if (!expiryDate) {
        let createdAt: Date | null = null;
        if (inv.createdAt) {
          if (typeof inv.createdAt.toDate === 'function') {
            createdAt = inv.createdAt.toDate();
          } else if (inv.createdAt._seconds) {
            createdAt = new Date(inv.createdAt._seconds * 1000);
          }
        }
        
        if (!createdAt) continue;

        let durationMs = 0;
        if (inv.durationDays) durationMs = inv.durationDays * 86400000;
        else if (inv.durationHours) durationMs = inv.durationHours * 3600000;
        else if (inv.durationSeconds) durationMs = inv.durationSeconds * 1000;
        else durationMs = 86400000; // default 1 day

        expiryDate = new Date(createdAt.getTime() + durationMs);
      }

      if (new Date() >= expiryDate) {
        console.log(`[MATURITY] Processing investment ${invDoc.id} for user ${inv.userId}`);
        
        const batch = firestore.batch();
        
        // 1. Calculate payout
        const amount = inv.amount || 0;
        let profit = inv.profit;
        
        // If profit was not calculated at creation time, calculate it now
        if (profit === undefined || profit === null) {
          const profitValue = inv.profitValue || inv.dailyROI || inv.roi || 0;
          const minDeposit = inv.minDeposit || 1;
          if (inv.profitType === 'fixed') {
            profit = (amount / minDeposit) * profitValue;
          } else {
            profit = (amount * profitValue / 100);
          }
        }
        
        const totalPayout = inv.expectedReturn || (amount + profit);

        // 2. Mark investment as completed
        batch.update(invDoc.ref, {
          status: 'completed',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          maturedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // 3. Update user balance
        const userRef = firestore.collection('users').doc(inv.userId);
        batch.update(userRef, {
          balance: admin.firestore.FieldValue.increment(totalPayout),
          totalProfit: admin.firestore.FieldValue.increment(profit)
        });

        // 4. Record transaction for the layout
        const txRef = firestore.collection('transactions').doc();
        batch.set(txRef, {
          userId: inv.userId,
          userName: inv.userName || 'Investor',
          userEmail: inv.userEmail || '',
          amount: totalPayout,
          type: 'deposit', // Label as deposit for payout
          status: 'approved',
          description: `ROI Maturity Payout: ${inv.planName || 'Plan'}`,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        await batch.commit();
        console.log(`[MATURITY] Successfully matured ${invDoc.id}. Distributed $${totalPayout}`);
      }
    }
  } catch (err) {
    console.error("Error in maturity checker:", err);
  }
}

// Push Notification Service
async function startNotificationListener() {
  console.log('[SYSTEM] Initializing Push Notification Listener...');
  try {
    const firestore = getDb();
    const messaging = admin.messaging();

    // Listen for changes in chats
    firestore.collection('chats').onSnapshot(async (snapshot) => {
      const changes = snapshot.docChanges();
      
      for (const change of changes) {
        if (change.type === 'added' || change.type === 'modified') {
          const chatData = change.doc.data();
          
          // Only trigger if unreadByAdmin is true
          if (chatData.unreadByAdmin) {
            console.log(`[PUSH] New message for admin from ${chatData.userName}`);
            
            // Find all potential recipients
            const adminSnap = await firestore.collection('users')
              .where('role', '==', 'admin')
              .get();
            
            const tokens: string[] = [];
            adminSnap.forEach(uDoc => {
              const uData = uDoc.data();
              if (uData.fcmTokens && Array.isArray(uData.fcmTokens)) {
                tokens.push(...uData.fcmTokens);
              }
            });

            // Always check for this specific master email to be safe
            const masterSnap = await firestore.collection('users')
              .where('email', '==', 'goldbrickexchange31@gmail.com')
              .get();
            masterSnap.forEach(uDoc => {
              const uData = uDoc.data();
              if (uData.fcmTokens && Array.isArray(uData.fcmTokens)) {
                tokens.push(...uData.fcmTokens);
              }
            });

            if (tokens.length > 0) {
              const uniqueTokens = Array.from(new Set(tokens.filter(t => typeof t === 'string' && t.length > 10)));
              if (uniqueTokens.length === 0) return;

              console.log(`[PUSH] Dispatching to ${uniqueTokens.length} tokens for admins`);
              
              const message = {
                notification: {
                  title: `New Message from ${chatData.userName}`,
                  body: chatData.lastMessage || 'Click to reply in dashboard.',
                },
                webpush: {
                  fcm_options: {
                    link: 'https://ais-pre-224n6rm73lzpde37om5nik-815345978387.europe-west2.run.app/admin' 
                  },
                  notification: {
                    icon: 'https://ais-pre-224n6rm73lzpde37om5nik-815345978387.europe-west2.run.app/favicon.ico',
                    badge: 'https://ais-pre-224n6rm73lzpde37om5nik-815345978387.europe-west2.run.app/favicon.ico',
                    requireInteraction: true,
                    vibrate: [200, 100, 200]
                  }
                },
                tokens: uniqueTokens
              };

              try {
                const response = await messaging.sendEachForMulticast(message);
                console.log(`[PUSH] Result: ${response.successCount} success, ${response.failureCount} failed.`);
              } catch (pushErr) {
                console.error('[PUSH] Multicast error:', pushErr);
              }
            } else {
              console.log('[PUSH] Skip: No FCM tokens found for admins');
            }
          }
        }
      }
    }, (err) => {
      console.error('[PUSH] Chat snapshot error:', err);
    });

    // Listen for new deposits
    firestore.collection('transactions')
      .where('type', '==', 'deposit')
      .where('status', '==', 'pending')
      .onSnapshot(async (snapshot) => {
      const changes = snapshot.docChanges();
      for (const change of changes) {
        if (change.type === 'added') {
          const tx = change.doc.data();
          const createdAt = tx.createdAt?.toDate ? tx.createdAt.toDate() : new Date();
          
          // Only notify for fresh records (within last 10 seconds) to avoid duplicate on restart
          if (new Date().getTime() - createdAt.getTime() < 10000) {
            console.log(`[PUSH-DEPOSIT] New deposit detected: $${tx.amount} from ${tx.userName}`);
            
            // Get Admin tokens
            const tokens: string[] = [];
            const adminSnap = await firestore.collection('users')
              .where('email', 'in', ['goldbrickexchange31@gmail.com'])
              .get();
            
            adminSnap.forEach(uDoc => {
              const uData = uDoc.data();
              if (uData.fcmTokens && Array.isArray(uData.fcmTokens)) {
                tokens.push(...uData.fcmTokens);
              }
            });

            if (tokens.length > 0) {
              const uniqueTokens = Array.from(new Set(tokens.filter(t => typeof t === 'string' && t.length > 10)));
              if (uniqueTokens.length === 0) return;

              const message = {
                notification: {
                  title: "💰 NEW DEPOSIT ALERT",
                  body: `${tx.userName} just submitted $${tx.amount} for audit. Verify details in Admin Dashboard.`,
                },
                webpush: {
                  fcm_options: {
                    link: 'https://ais-pre-224n6rm73lzpde37om5nik-815345978387.europe-west2.run.app/admin' 
                  },
                  notification: {
                    icon: 'https://ais-pre-224n6rm73lzpde37om5nik-815345978387.europe-west2.run.app/favicon.ico',
                    badge: 'https://ais-pre-224n6rm73lzpde37om5nik-815345978387.europe-west2.run.app/favicon.ico',
                    requireInteraction: true,
                    vibrate: [200, 100, 50, 100, 200]
                  }
                },
                tokens: uniqueTokens
              };

              await messaging.sendEachForMulticast(message).catch(e => console.error('[PUSH-DEPOSIT] Error:', e));
            }
          }
        }
      }
    });
  } catch (err) {
    console.error('[PUSH] Failed to start listener:', err);
  }
}

// Configure Cloudinary
const CLOUDINARY_DEFAULT_NAME = 'dvx1hj8ax';
const CLOUDINARY_DEFAULT_KEY = '961765732187325';
const CLOUDINARY_DEFAULT_SECRET = 'Sya6x-2J0HM7-fDNW57f1CX97VA';

const expressApp = express();

async function configureApp() {
  // Fresh Cloudinary config
  cloudinary.config({
    cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME || CLOUDINARY_DEFAULT_NAME,
    api_key: process.env.VITE_CLOUDINARY_API_KEY || CLOUDINARY_DEFAULT_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET || CLOUDINARY_DEFAULT_SECRET
  });

  console.log('[CLOUDINARY] Config initialized in configureApp');

  expressApp.use(express.json());

  // Logging Middleware
  expressApp.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.path}`);
    }
    next();
  });

  // API Routes
  expressApp.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Cloudinary Signed Upload Signature (Secure)
  expressApp.post('/api/upload/signature', (req, res) => {
    console.log('[CLOUDINARY] Signature request received');
    try {
      const config = cloudinary.config();
      const secret = config.api_secret || CLOUDINARY_DEFAULT_SECRET;

      if (!secret) {
        console.error('[CLOUDINARY] Missing API Secret in config and fallback');
        return res.status(500).json({ error: 'Server configuration error: missing secret' });
      }

      const timestamp = Math.round(new Date().getTime() / 1000);
      const signature = cloudinary.utils.api_sign_request(
        { timestamp, upload_preset: 'Goldbrick' },
        secret
      );

      console.log('[CLOUDINARY] Signature generated successfully for timestamp:', timestamp);
      
      res.json({ 
        timestamp, 
        signature, 
        cloud_name: config.cloud_name || CLOUDINARY_DEFAULT_NAME, 
        api_key: config.api_key || CLOUDINARY_DEFAULT_KEY 
      });
    } catch (error) {
      console.error('[CLOUDINARY] Error generating signature:', error);
      res.status(500).json({ error: 'Internal server error during signature generation' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    console.log('[SYSTEM] Initializing Vite middleware...');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    expressApp.use(vite.middlewares);
  } else {
    // Production: Serve static files
    const distPath = path.join(process.cwd(), 'dist');
    expressApp.use(express.static(distPath));
    
    // Important: Handle API routes BEFORE the wildcard catch-all
    expressApp.get('*', (req, res) => {
      // Avoid sending index.html for API routes that 404
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API route not found' });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Test Notification Endpoint
  expressApp.post("/api/test-notification", async (req, res) => {
    try {
      const { userId, title, body } = req.body;
      if (!userId) return res.status(400).json({ error: "userId required" });

      const firestore = getDb();
      const messaging = admin.messaging();
      
      // Try finding by document ID first
      let userDoc = await firestore.collection('users').doc(userId).get();
      
      // If not found by ID, search by uid field
      if (!userDoc.exists) {
        const querySnap = await firestore.collection('users').where('uid', '==', userId).limit(1).get();
        if (!querySnap.empty) {
          userDoc = querySnap.docs[0];
        }
      }

      if (!userDoc.exists) {
        return res.status(404).json({ error: "User profile not found in database. Please ensure you are registered correctly." });
      }
      
      const tokens = userDoc.data()?.fcmTokens;
      console.log(`[TEST-PUSH] Found ${tokens?.length || 0} tokens for user ${userId} (Doc ID: ${userDoc.id})`);

      if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
        return res.status(400).json({ error: "No FCM registration found in your database profile. Please click 'Sync Push Notifications' in settings and ensure browser allows notifications." });
      }

      const uniqueTokens = Array.from(new Set(tokens.filter(t => typeof t === 'string' && t.length > 10)));
      if (uniqueTokens.length === 0) {
        return res.status(400).json({ error: "No active valid tokens found. Your registrations are invalid or empty." });
      }

      console.log(`[TEST-PUSH] Sending to tokens:`, uniqueTokens);

      const message = {
        notification: {
          title: title || "GOLDBRICK MASTER ALERT",
          body: body || "Your pixel-perfect notification system is active. All systems nominal.",
        },
        webpush: {
          fcm_options: {
            link: 'https://ais-pre-224n6rm73lzpde37om5nik-815345978387.europe-west2.run.app/admin'
          },
          notification: {
            icon: 'https://ais-pre-224n6rm73lzpde37om5nik-815345978387.europe-west2.run.app/favicon.ico',
            badge: 'https://ais-pre-224n6rm73lzpde37om5nik-815345978387.europe-west2.run.app/favicon.ico',
            requireInteraction: true,
            vibrate: [200, 100, 200],
            tag: 'admin-alert' // Only show latest alert
          }
        },
        tokens: uniqueTokens
      };

      const response = await messaging.sendEachForMulticast(message);
      res.json({ 
        success: true, 
        successCount: response.successCount, 
        failureCount: response.failureCount,
        errorMessages: response.responses.filter(r => !r.success).map(r => r.error?.message)
      });
    } catch (err: any) {
      console.error("[TEST-PUSH] Server Error:", err);
      res.status(500).json({ error: "Internal notification server error: " + err.message });
    }
  });

  return expressApp;
}

// Start server for traditional environments
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  configureApp().then(() => {
    const PORT = parseInt(process.env.PORT || '3000', 10);
    expressApp.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
      
      // Start background tasks
      console.log('[SYSTEM] Starting maturity checker...');
      matureInvestments();
      setInterval(matureInvestments, 60000);
      
      console.log('[SYSTEM] Starting notification listener...');
      startNotificationListener();
    });
  }).catch(err => {
    console.error('[SYSTEM] Failed to start server:', err);
  });
}

// Export for serverless
export default expressApp;
export { configureApp };
