import express from 'express';
import Redis from 'ioredis';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { loadAndValidateOnboardingConfig } from './config/env.config';
import { PrismaProfileRepository } from './infrastructure/persistence/PrismaProfileRepository';
import { RedisIdempotencyRepository } from './infrastructure/persistence/RedisIdempotencyRepository';
import { ProcessOnboardingEventUseCase } from './application/use-cases/ProcessOnboardingEvent.usecase';
import { RabbitMQConsumer } from './infrastructure/messaging/RabbitMQConsumer';
import { HealthController } from './interface/controllers/HealthController';

async function bootstrap() {
  const config = loadAndValidateOnboardingConfig();

  console.log('🚀 Starting VibeGrid Onboarding Worker...');

  // 0. Auto Push Prisma Schema (for Dev / Bootstrap)
  if (config.prismaDbPush) {
    try {
      console.log('🔄 Syncing PostgreSQL schema with Prisma...');
      execSync('npx prisma db push --accept-data-loss', {
        stdio: 'inherit',
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: config.databaseUrl },
      });
      console.log('✅ PostgreSQL schema updated successfully!');
    } catch (pushErr: any) {
      console.warn('⚠️ Prisma db push warning:', pushErr?.message || pushErr);
    }
  }

  // 1. Redis & Prisma Connections
  const redisClient = new Redis(config.redisUrl);
  redisClient.on('connect', () => console.log('✅ Connected to Redis for Onboarding Idempotency'));
  redisClient.on('error', (err) => console.error('❌ Redis Connection Error:', err));

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: config.databaseUrl,
      },
    },
  });

  // 2. Application Repositories & Use Cases
  const profileRepo = new PrismaProfileRepository(prisma);
  const idempotencyRepo = new RedisIdempotencyRepository(redisClient);
  const processOnboardingUseCase = new ProcessOnboardingEventUseCase(profileRepo, idempotencyRepo);

  // 3. RabbitMQ Consumer
  const rabbitConsumer = new RabbitMQConsumer(
    {
      url: config.rabbitUrl,
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

  const server = app.listen(config.port, () => {
    console.log(`✅ Onboarding Worker health server running on port ${config.port}`);
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
