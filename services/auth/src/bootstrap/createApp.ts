import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import mongoose from 'mongoose';
import { ServiceContainer } from './container';
import { createAuthRouter } from '../interface/http/routes/auth.routes';
import { createAdminRouter } from '../interface/http/routes/admin.routes';

export function createApp(container: ServiceContainer): Express {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());
  app.use(cors({ origin: true, credentials: true }));

  // Liveness Check Endpoint
  app.get(['/health', '/healthz'], (req, res) => {
    res.status(200).json({ status: 'ok', service: 'auth-microservice' });
  });

  // Readiness Check Endpoint (verifies DB readiness)
  app.get(['/ready', '/readyz'], (req, res) => {
    const isDbConnected = mongoose.connection.readyState === 1;
    if (isDbConnected) {
      res.status(200).json({ status: 'ready', database: 'connected' });
    } else {
      res.status(503).json({ status: 'not_ready', database: 'disconnected' });
    }
  });

  // Create HTTP Routers
  const authRouter = createAuthRouter(
    container.authController,
    container.oauthController,
    container.protectMiddleware
  );
  const adminRouter = createAdminRouter(
    container.adminUserController,
    container.protectMiddleware
  );

  // Mount Routers (Specific routes before generic)
  app.use('/api/auth/admin', adminRouter);
  app.use('/api/auth', authRouter);

  return app;
}
