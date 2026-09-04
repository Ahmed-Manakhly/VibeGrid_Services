import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { PrismaProfileRepository } from './infrastructure/persistence/PrismaProfileRepository';
import { RedisIdempotencyRepository } from './infrastructure/persistence/RedisIdempotencyRepository';
import { ProcessOnboardingEventUseCase } from './application/use-cases/ProcessOnboardingEvent.usecase';
import { RabbitMQConsumer } from './infrastructure/messaging/RabbitMQConsumer';
import { HealthController } from './interface/controllers/HealthController';

async function bootstrap() {
  const port = process.env.PORT || 8004;
  const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://vibegrid:VgRabbit_MQ2026%23b5%24WvL%212jRx@localhost:5672';
  const redisUrl = process.env.REDIS_URL || 'redis://:VgRedis_R2026%23m4%24ZpQ%219wKx@localhost:6379';

  console.log('🚀 Starting VibeGrid Onboarding Worker...');

  // 1. Redis & Prisma Connections
  const redisClient = new Redis(redisUrl);
  redisClient.on('connect', () => console.log('✅ Connected to Redis for Onboarding Idempotency'));
  redisClient.on('error', (err) => console.error('❌ Redis Connection Error:', err));

  const prisma = new PrismaClient();

  // 2. Application Repositories & Use Cases
  const profileRepo = new PrismaProfileRepository(prisma);
  const idempotencyRepo = new RedisIdempotencyRepository(redisClient);
  const processOnboardingUseCase = new ProcessOnboardingEventUseCase(profileRepo, idempotencyRepo);

  // 3. RabbitMQ Consumer
  const rabbitConsumer = new RabbitMQConsumer(
    {
      url: rabbitUrl,
      exchange: 'domain.events',
      queue: 'q.user.onboarding',
      dlxExchange: 'dlx.domain.events',
      dlxQueue: 'q.dlq',
      prefetch: 10,
    },
    processOnboardingUseCase
  );

  await rabbitConsumer.start().catch((err) => {
    console.error('❌ Failed to start RabbitMQ Onboarding Consumer:', err);
  });

  // 4. Express HTTP Server for Health Checks
  const app = express();
  app.use(express.json());

  app.get('/health', HealthController.getHealth);

  const server = app.listen(port, () => {
    console.log(`✅ Onboarding Worker health server running on port ${port}`);
  });

  // Graceful Shutdown
  const shutdown = async () => {
    console.log('\n🛑 Shutting down Onboarding Worker...');
    server.close();
    await rabbitConsumer.stop();
    await prisma.$disconnect();
    redisClient.disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((err) => {
  console.error('💥 Fatal Onboarding Worker Bootstrap Error:', err);
  process.exit(1);
});
