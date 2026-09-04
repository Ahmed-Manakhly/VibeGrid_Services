import http from 'http';
import express from 'express';
import request from 'supertest';
import { HealthController } from '../src/interface/http/HealthController';

describe('Realtime Gateway — HTTP Health Endpoints', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    const healthHandler = HealthController.createHandler(
      'redis://invalid-host-test:6379',
      () => null
    );

    app.get('/health', healthHandler);
    app.get('/ready', healthHandler);
    app.get('/api/realtime/health', healthHandler);
  });

  it('should return health status endpoint response structure', async () => {
    const res = await request(app).get('/health');
    expect(res.body.service).toBe('vibegrid-realtime-gateway');
    expect(res.body.status).toBe('degraded'); // Failed redis connection returns degraded
    expect(res.body.redisConnected).toBe(false);
  });
});
