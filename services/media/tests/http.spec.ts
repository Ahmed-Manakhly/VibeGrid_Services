import request from 'supertest';
import express from 'express';
import { createMediaAuthMiddleware } from '../src/interface/http/middleware/mediaAuthMiddleware';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

describe('Media HTTP Endpoints & Auth Middleware', () => {
  const privateKey = fs.readFileSync(path.resolve(__dirname, '../../auth/secrets/jwt.private.key'), 'utf8');
  const publicKey = fs.readFileSync(path.resolve(__dirname, '../../auth/secrets/jwt.public.key'), 'utf8');

  const app = express();
  app.use(express.json());
  const authMiddleware = createMediaAuthMiddleware(path.resolve(__dirname, '../../auth/secrets/jwt.public.key'));

  app.get('/test-protected', authMiddleware, (req: any, res: any) => {
    res.json({ status: 'success', user: req.user });
  });

  it('should reject unauthenticated request with 401', async () => {
    const res = await request(app).get('/test-protected');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Authentication required');
  });

  it('should accept valid RS256 JWT in Authorization header', async () => {
    const token = jwt.sign(
      { sub: 'usr_123', email: 'test@example.com', role: 'USER' },
      privateKey,
      { algorithm: 'RS256', expiresIn: '15m', issuer: 'vibegrid-auth-service', audience: 'vibegrid-api' }
    );

    const res = await request(app)
      .get('/test-protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.userId).toBe('usr_123');
    expect(res.body.user.email).toBe('test@example.com');
  });
});
