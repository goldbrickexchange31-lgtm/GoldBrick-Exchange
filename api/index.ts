import app from '../server.ts';
import { configureApp } from '../server.ts';

let initializedApp: any = null;

export default async (req: any, res: any) => {
  if (!initializedApp) {
    initializedApp = await configureApp();
  }
  return initializedApp(req, res);
};
