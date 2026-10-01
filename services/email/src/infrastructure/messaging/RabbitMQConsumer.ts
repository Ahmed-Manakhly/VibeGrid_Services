import amqp, { Channel, ConsumeMessage } from 'amqplib';
import { createLogger } from '@vibegrid/logger';
import { validateEvent } from '@vibegrid/contracts';
import { ProcessEmailEventUseCase } from '../../application/use-cases/ProcessEmailEvent.usecase';

const logger = createLogger('vibegrid-email');
export interface RabbitMQConsumerConfig {
  url: string;
  exchange: string;
  queue: string;
  dlxExchange: string;
  dlxQueue: string;
  prefetch?: number;
}

export class RabbitMQConsumer {
  private connection: any = null;
  private channel: Channel | null = null;

  constructor(
    private config: RabbitMQConsumerConfig,
    private processEmailUseCase: ProcessEmailEventUseCase
  ) {}

  public async start(): Promise<void> {
    const { url, exchange, queue, dlxExchange, dlxQueue, prefetch = 10 } = this.config;

    this.connection = await amqp.connect(url);
    this.channel = await this.connection.createChannel();

    if (!this.channel) throw new Error('Failed to create RabbitMQ channel');

    await this.channel.prefetch(prefetch);

    // 1. Assert Primary Domain Events Exchange
    await this.channel.assertExchange(exchange, 'topic', { durable: true });

    // 2. Assert DLX / Retry Exchanges & Queues
    const retryExchange = 'dlx.email.retry';
    const retryQueue10s = 'q.email.retry.10s';

    await this.channel.assertExchange(retryExchange, 'direct', { durable: true });
    await this.channel.assertExchange(dlxExchange, 'direct', { durable: true });

    await this.channel.assertQueue(dlxQueue, { durable: true });
    await this.channel.bindQueue(dlxQueue, dlxExchange, 'dlq.email');

    // 10-second delayed retry queue re-routing back to primary exchange
    await this.channel.assertQueue(retryQueue10s, {
      durable: true,
      arguments: {
        'x-message-ttl': 10000,
        'x-dead-letter-exchange': exchange,
        'x-dead-letter-routing-key': queue,
      },
    });
    await this.channel.bindQueue(retryQueue10s, retryExchange, 'retry.email');

    // 3. Assert Primary Email Queue with DLX configuration
    await this.channel.assertQueue(queue, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': retryExchange,
        'x-dead-letter-routing-key': 'retry.email',
      },
    });

    // Bind canonical routing keys to primary queue
    await this.channel.bindQueue(queue, exchange, 'user.registered');
    await this.channel.bindQueue(queue, exchange, 'email.verification.requested');
    await this.channel.bindQueue(queue, exchange, 'password.reset.requested');

    logger.info(`Bound queue [${queue}] to exchange [${exchange}]`, { queue, exchange });

    // 4. Start Consumer Loop
    await this.channel.consume(queue, async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      try {
        const content = msg.content.toString();
        const rawEnvelope = JSON.parse(content);
        const validatedEvent = validateEvent(rawEnvelope);
        const correlationId = validatedEvent.correlationId || validatedEvent.eventId;

        logger.info(`Processing email event [${validatedEvent.eventName}]`, {
          eventId: validatedEvent.eventId,
          eventName: validatedEvent.eventName,
          correlationId,
        });

        const result = await this.processEmailUseCase.execute(validatedEvent as any);

        if (result.success) {
          this.channel?.ack(msg);
        }
      } catch (err: any) {
        const deathCount = this.getDeathCount(msg);
        logger.error(`Processing error (attempt ${deathCount + 1}): ${err?.message || err}`, {
          attempt: deathCount + 1,
          errorMessage: err?.message || String(err),
          stack: err?.stack
        });

        if (deathCount >= 3) {
          logger.warn(`Exceeded max retries (3). Routing event to DLQ: ${dlxQueue}`, { dlxQueue });
          // Send to DLQ via DLX
          this.channel?.publish(dlxExchange, 'dlq.email', msg.content, { persistent: true });
          this.channel?.ack(msg);
        } else {
          // Send to Retry Queue via NACK (requeue=false triggers x-dead-letter-exchange)
          this.channel?.nack(msg, false, false);
        }
      }
    });
  }

  private getDeathCount(msg: ConsumeMessage): number {
    const headers = msg.properties.headers;
    if (headers && headers['x-death']) {
      const xDeath = headers['x-death'];
      if (Array.isArray(xDeath) && xDeath.length > 0) {
        return xDeath[0].count || 1;
      }
    }
    return 0;
  }

  public async stop(): Promise<void> {
    if (this.channel) await this.channel.close().catch(() => {});
    if (this.connection) await this.connection.close().catch(() => {});
  }
}
