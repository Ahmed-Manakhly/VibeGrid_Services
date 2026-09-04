import express from 'express';
import http from 'http';
import cors from 'cors';
import { getRealtimeConfig } from './config/env.config';
import { SocketJwtAuthenticator } from './infrastructure/auth/SocketJwtAuthenticator';
import { RedisPresenceRepository } from './infrastructure/persistence/RedisPresenceRepository';
import { PinoRealtimeLogger } from './infrastructure/logging/PinoRealtimeLogger';
import { RedisPubSubSubscriber } from './infrastructure/pubsub/RedisPubSubSubscriber';
import { RealtimeSocketHandler } from './interface/socket/RealtimeSocketHandler';
import { HealthController } from './interface/http/HealthController';

async function bootstrap() {
  const config = getRealtimeConfig();
  const logger = new PinoRealtimeLogger('vibegrid-realtime-gateway');

  logger.info('🚀 Initializing VibeGrid Realtime Gateway...');

  const app = express();
  app.use(cors({ origin: config.allowedOrigins, credentials: true }));
  app.use(express.json());

  const httpServer = http.createServer(app);

  const authenticator = new SocketJwtAuthenticator(config.jwtPublicKeyPath, config.jwtPublicKey);
  const presenceTracker = new RedisPresenceRepository(config.redisUrl);

  let pubSubSubscriber: RedisPubSubSubscriber | null = null;

  const realtimeHandler = new RealtimeSocketHandler(httpServer, {
    authenticator,
    presenceTracker,
    pubSubPublisher: async (channel, payload) => {
      if (pubSubSubscriber) {
        return await pubSubSubscriber.publish(channel, payload);
      }
      return 0;
    },
    logger,
    allowedOrigins: config.allowedOrigins,
  });

  pubSubSubscriber = new RedisPubSubSubscriber(config.redisUrl, realtimeHandler, logger);
  await pubSubSubscriber.start();

  // Express HTTP Health Check Routes
  const healthHandler = HealthController.createHandler(config.redisUrl, () => realtimeHandler.getIoServer());
  app.get('/health', healthHandler);
  app.get('/ready', healthHandler);
  app.get('/api/realtime/health', healthHandler);
  app.get('/api/realtime/ready', healthHandler);

  const server = httpServer.listen(config.port, () => {
    logger.info(`✅ Realtime Gateway listening on port ${config.port}`);
  });

  // Graceful Shutdown
  const shutdown = async () => {
    logger.info('🛑 Shutting down Realtime Gateway...');
    if (pubSubSubscriber) {
      await pubSubSubscriber.stop();
    }
    await realtimeHandler.close();
    server.close(() => {
      logger.info('✅ Realtime Gateway server closed cleanly');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap().catch((err) => {
    console.error('💥 Fatal Realtime Gateway Bootstrap Error:', err);
    process.exit(1);
  });
}
