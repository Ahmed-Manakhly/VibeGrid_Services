import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import Redis from 'ioredis';
import { NodemailerAdapter } from './infrastructure/email-providers/NodemailerAdapter';
import { RedisIdempotencyRepository } from './infrastructure/persistence/RedisIdempotencyRepository';
import { ProcessEmailEventUseCase } from './application/use-cases/ProcessEmailEvent.usecase';
import { RabbitMQConsumer } from './infrastructure/messaging/RabbitMQConsumer';
import { HealthController } from './interface/controllers/HealthController';

async function bootstrap() {
  const port = process.env.PORT || 8003;
  const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://vibegrid:VgRabbit_MQ2026%23b5%24WvL%212jRx@localhost:5672';
  const redisUrl = process.env.REDIS_URL || 'redis://:VgRedis_R2026%23m4%24ZpQ%219wKx@localhost:6379';

  console.log('🚀 Starting VibeGrid Email Service...');

  // 1. Redis Connection
  const redisClient = new Redis(redisUrl);
  redisClient.on('connect', () => console.log('✅ Connected to Redis for Email Idempotency'));
  redisClient.on('error', (err) => console.error('❌ Redis Connection Error:', err));

  // 2. Email Provider Adapter
  const emailProvider = new NodemailerAdapter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'VibeGrid Support <no-reply@vibegrid.com>',
  });

  // 3. Application Use Case
  const idempotencyRepo = new RedisIdempotencyRepository(redisClient);
  const processEmailUseCase = new ProcessEmailEventUseCase(emailProvider, idempotencyRepo);

  // 4. RabbitMQ Consumer
  const rabbitConsumer = new RabbitMQConsumer(
    {
      url: rabbitUrl,
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

  const server = app.listen(port, () => {
    console.log(`✅ Email Service running on port ${port}`);
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
