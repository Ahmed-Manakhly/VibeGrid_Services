import mongoose from 'mongoose';
import { Server } from 'http';
import { loadAndValidateConfig } from '../config/env';
import { RabbitMQPublisher } from '../infrastructure/messaging/RabbitMQPublisher';
import { createContainer } from '../bootstrap/container';
import { createApp } from '../bootstrap/createApp';
import { ensureBootstrapUsers } from '../bootstrap/ensureBootstrapUsers';

async function bootstrap() {
  // 1. Load and validate environment configuration (Fail-fast)
  const config = loadAndValidateConfig();
  console.log(`[Auth Service] Starting in ${config.nodeEnv} mode...`);

  // 2. Connect MongoDB (Fail-fast on error)
  try {
    await mongoose.connect(config.mongoUri);
    console.log('✅ Auth Service connected to MongoDB database');
  } catch (err: any) {
    console.error('❌ Fatal error: Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }

  // 3. Connect RabbitMQ Event Publisher
  const eventPublisher = new RabbitMQPublisher(config.rabbitmqUrl);
  try {
    await eventPublisher.connect();
    console.log('✅ Auth Service connected to RabbitMQ broker');
  } catch (err: any) {
    console.warn('⚠️ Warning: RabbitMQ connection unavailable:', err.message);
  }

  // 4. Create Composition Container & Dependency Graph
  const container = createContainer(config, eventPublisher);

  // 5. Seed Bootstrap Dev/Admin Users (if configured)
  await ensureBootstrapUsers(config, container.userAuthRepo, container.adminCreateUserUseCase);

  // 6. Create Express Application
  const app = createApp(container);

  // 7. Start HTTP Server
  const server: Server = app.listen(config.port, () => {
    console.log(`🚀 Auth Microservice running on port ${config.port}`);
    console.log(`   Liveness:  http://localhost:${config.port}/health`);
    console.log(`   Readiness: http://localhost:${config.port}/ready`);
  });

  // 8. Idempotent Graceful Shutdown Lifecycle
  let isShuttingDown = false;

  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n[Auth Service] Received ${signal}. Initiating graceful shutdown...`);

    // Step A: Stop accepting new HTTP requests
    server.close(async () => {
      console.log('  [Shutdown] HTTP server closed.');

      // Step B: Disconnect RabbitMQ Event Publisher
      try {
        await eventPublisher.disconnect();
        console.log('  [Shutdown] RabbitMQ disconnected.');
      } catch (err) {
        // Ignore or log shutdown error
      }

      // Step C: Disconnect MongoDB Mongoose Connection
      try {
        await mongoose.disconnect();
        console.log('  [Shutdown] MongoDB connection closed.');
      } catch (err) {
        // Ignore or log shutdown error
      }

      console.log('[Auth Service] Graceful shutdown completed cleanly. Exiting.');
      process.exit(0);
    });

    // Fallback force exit timeout after 10 seconds
    setTimeout(() => {
      console.error('[Auth Service] Shutdown timed out. Forcing process exit.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('Fatal error during Auth Microservice bootstrap:', err);
  process.exit(1);
});
