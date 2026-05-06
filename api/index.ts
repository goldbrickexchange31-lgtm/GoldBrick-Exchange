import express from 'express';
import { configureApp } from '../server.js';

let expressApp: express.Express | null = null;

export default async (req: any, res: any) => {
  try {
    if (!expressApp) {
      console.log('[VERCEL] Starting app configuration...');
      expressApp = await configureApp();
      console.log('[VERCEL] App configuration complete');
    }
    
    // Handle the request
    return expressApp(req, res);
  } catch (error) {
    console.error('[VERCEL] API Handler Error:', error);
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : { message: String(error) };

    res.status(500).json({
      error: 'FUNCTION_INVOCATION_FAILED',
      details: errorDetails,
      node_version: process.version,
      env: process.env.NODE_ENV
    });
  }
};
