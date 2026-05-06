import { configureApp } from '../server.ts';

let initializedApp: any = null;

export default async (req: any, res: any) => {
  try {
    if (!initializedApp) {
      console.log('[VERCEL] Initializing app...');
      initializedApp = await configureApp();
      console.log('[VERCEL] App initialized successfully');
    }
    return initializedApp(req, res);
  } catch (error) {
    console.error('[VERCEL] Critical error in API handler:', error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      details: error instanceof Error ? error.message : String(error)
    });
  }
};
