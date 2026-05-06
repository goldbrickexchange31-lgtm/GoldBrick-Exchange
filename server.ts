import express from 'express';
import { createServer as createViteServer } from 'vite';
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

// Initialize Admin SDK
const app = admin.initializeApp({
  projectId: firebaseConfig.projectId,
});

const db = admin.firestore(app);
if (firebaseConfig.databaseId) {
  // For different database IDs, ensure we are targeting correctly
  // @ts-ignore
  db.settings({
    databaseId: firebaseConfig.databaseId,
    ignoreUndefinedProperties: true
  });
}

// Background Task: Mature Investments
async function matureInvestments() {
  try {
    const invRef = db.collection('investments');
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
        
        // 1. Mark investment as completed
        await invDoc.ref.update({
          status: 'completed',
          maturedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 2. Calculate payout
        const amount = inv.amount || 0;
        let profit = inv.profit;
        
        // If profit was not calculated at creation time, calculate it now
        if (profit === undefined || profit === null) {
          const profitValue = inv.profitValue || inv.dailyROI || inv.roi || 0;
          const minDeposit = inv.minDeposit || 1;
          if (inv.profitType === 'fixed') {
            // Proportional profit based on minDeposit
            profit = (amount / minDeposit) * profitValue;
          } else {
            // Percent yield for the duration
            profit = (amount * profitValue / 100);
          }
        }
        
        const totalPayout = inv.expectedReturn || (amount + profit);
        
        // 3. Update user balance
        const userRef = db.collection('users').doc(inv.userId);
        await userRef.update({
          balance: admin.firestore.FieldValue.increment(totalPayout),
          totalProfit: admin.firestore.FieldValue.increment(profit)
        });

        // 4. Record transaction for the layout
        await db.collection('transactions').add({
          userId: inv.userId,
          userName: inv.userName || 'Investor',
          userEmail: inv.userEmail || '',
          amount: totalPayout,
          type: 'deposit', // Label as deposit for payout
          status: 'approved',
          description: `ROI Maturity Payout: ${inv.planName || 'Plan'}`,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`[MATURITY] Successfully matured ${invDoc.id}. Distributed $${totalPayout}`);
      }
    }
  } catch (err) {
    console.error("Error in maturity checker:", err);
  }
}

// Run maturity check every 1 minute
// Removed top-level calls, moved inside startServer() to ensure initialization order

// Configure Cloudinary
const CLOUDINARY_DEFAULT_NAME = 'dvx1hj8ax';
const CLOUDINARY_DEFAULT_KEY = '961765732187325';
const CLOUDINARY_DEFAULT_SECRET = 'Sya6x-2J0HM7-fDNW57f1CX97VA';

cloudinary.config({
  cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME || CLOUDINARY_DEFAULT_NAME,
  api_key: process.env.VITE_CLOUDINARY_API_KEY || CLOUDINARY_DEFAULT_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET || CLOUDINARY_DEFAULT_SECRET
});

console.log('[CLOUDINARY] Config initialized with cloud_name:', cloudinary.config().cloud_name);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Logging Middleware
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.path}`);
    }
    next();
  });

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Cloudinary Signed Upload Signature (Secure)
  app.post('/api/upload/signature', (req, res) => {
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
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Important: Handle API routes BEFORE the wildcard catch-all
    app.get('*', (req, res) => {
      // Avoid sending index.html for API routes that 404
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API route not found' });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Start background tasks after server is up
    console.log('[SYSTEM] Starting maturity checker...');
    matureInvestments();
    setInterval(matureInvestments, 60000);
  });
}

startServer().catch(err => {
  console.error('[SYSTEM] Failed to start server:', err);
});
