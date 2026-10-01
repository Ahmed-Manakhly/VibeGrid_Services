import express from 'express';
import Redis from 'ioredis';
import { createLogger } from '@vibegrid/logger';
import { loadAndValidateEmailConfig } from './config/env.config';
import { NodemailerAdapter } from './infrastructure/email-providers/NodemailerAdapter';
import { RedisIdempotencyRepository } from './infrastructure/persistence/RedisIdempotencyRepository';
import { ProcessEmailEventUseCase } from './application/use-cases/ProcessEmailEvent.usecase';
import { RabbitMQConsumer } from './infrastructure/messaging/RabbitMQConsumer';
import { HealthController } from './interface/controllers/HealthController';

const logger = createLogger('vibegrid-email');

async function bootstrap() {
  const config = loadAndValidateEmailConfig();

  logger.info('🚀 Starting VibeGrid Email Service...');

  // 1. Redis Connection
  const redisClient = new Redis(config.redisUrl);
  redisClient.on('connect', () => logger.info('✅ Connected to Redis for Email Idempotency'));
  redisClient.on('error', (err) => logger.error('❌ Redis Connection Error', { error: err }));

  // 2. Email Provider Adapter
  const emailProvider = new NodemailerAdapter(config.smtp);

  // 3. Application Use Case
  const idempotencyRepo = new RedisIdempotencyRepository(redisClient);
  const processEmailUseCase = new ProcessEmailEventUseCase(emailProvider, idempotencyRepo);

  // 4. RabbitMQ Consumer
  const rabbitConsumer = new RabbitMQConsumer(
    {
      url: config.rabbitUrl,
      exchange: 'domain.events',
      queue: 'q.email',
      dlxExchange: 'dlx.domain.events',
      dlxQueue: 'q.dlq',
      prefetch: 10,
    },
    processEmailUseCase
  );

  let rabbitConnected = false;
  let attempts = 0;
  while (!rabbitConnected && attempts < 10) {
    try {
      await rabbitConsumer.start();
      rabbitConnected = true;
      logger.info('✅ Connected to RabbitMQ in Email Service');
    } catch (err: any) {
      attempts++;
      logger.warn(`⚠️ Failed to connect RabbitMQ in Email Service (Attempt ${attempts}/10): ${err.message}. Retrying in 3s...`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  // 5. Express HTTP Server for Health Checks
  const app = express();
  app.use(express.json());

  app.get('/health', HealthController.getHealth);

  const server = app.listen(config.port, () => {
    logger.info(`✅ Email Service running on port ${config.port}`, { port: config.port });
  });

  // Graceful Shutdown
  const shutdown = async () => {
    logger.info('🛑 Shutting down Email Service...');
    server.close();
    await rabbitConsumer.stop();
    redisClient.disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((err) => {
  logger.error('Fatal Email Service Bootstrap Error', { error: err });
  process.exit(1);
});
