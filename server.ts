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
  projectId: "gen-lang-client-0494127949",
  appId: "1:159687444580:web:5eeb9b9e7deba2ef1c7771",
  apiKey: "AIzaSyDlXFlGzaxtvpAXrzMEv6Dpm4foYTetnB4",
  authDomain: "gen-lang-client-0494127949.firebaseapp.com",
  databaseId: "ai-studio-ea749be8-2f23-4412-94ab-7c5b04dff757", // Use the custom database ID
};

// Initialize Admin SDK safely for serverless
let firebaseApp: admin.app.App | null = null;
let db: admin.firestore.Firestore | null = null;

function getDb() {
  if (db) return db;
  
  try {
    if (!admin.apps.length) {
      firebaseApp = admin.initializeApp({
        projectId: firebaseConfig.projectId,
      });
    } else {
      firebaseApp = admin.app();
    }

    db = admin.firestore(firebaseApp);
    if (firebaseConfig.databaseId) {
      db.settings({
        databaseId: firebaseConfig.databaseId,
        ignoreUndefinedProperties: true
      });
    }
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
    });
  }).catch(err => {
    console.error('[SYSTEM] Failed to start server:', err);
  });
}

// Export for serverless
export default expressApp;
export { configureApp };
