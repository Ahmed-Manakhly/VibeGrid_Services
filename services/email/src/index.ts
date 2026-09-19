import express from 'express';
import Redis from 'ioredis';
import { loadAndValidateEmailConfig } from './config/env.config';
import { NodemailerAdapter } from './infrastructure/email-providers/NodemailerAdapter';
import { RedisIdempotencyRepository } from './infrastructure/persistence/RedisIdempotencyRepository';
import { ProcessEmailEventUseCase } from './application/use-cases/ProcessEmailEvent.usecase';
import { RabbitMQConsumer } from './infrastructure/messaging/RabbitMQConsumer';
import { HealthController } from './interface/controllers/HealthController';

async function bootstrap() {
  const config = loadAndValidateEmailConfig();

  console.log('🚀 Starting VibeGrid Email Service...');

  // 1. Redis Connection
  const redisClient = new Redis(config.redisUrl);
  redisClient.on('connect', () => console.log('✅ Connected to Redis for Email Idempotency'));
  redisClient.on('error', (err) => console.error('❌ Redis Connection Error:', err));

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

  await rabbitConsumer.start().catch((err) => {
    console.error('❌ Failed to start RabbitMQ Email Consumer:', err);
  });

  // 5. Express HTTP Server for Health Checks
  const app = express();
  app.use(express.json());

  app.get('/health', HealthController.getHealth);

  const server = app.listen(config.port, () => {
    console.log(`✅ Email Service running on port ${config.port}`);
  });

  // Graceful Shutdown
  const shutdown = async () => {
    console.log('\n🛑 Shutting down Email Service...');
    server.close();
    await rabbitConsumer.stop();
    redisClient.disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((err) => {
  console.error('💥 Fatal Email Service Bootstrap Error:', err);
  process.exit(1);
});
