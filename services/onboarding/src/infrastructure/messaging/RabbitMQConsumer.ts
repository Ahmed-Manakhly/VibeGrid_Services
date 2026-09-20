import amqp, { Channel, ConsumeMessage } from 'amqplib';
import pino from 'pino';
import { ProcessOnboardingEventUseCase } from '../../application/use-cases/ProcessOnboardingEvent.usecase';

const logger = pino({ name: 'vibegrid-onboarding' });

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
    private processOnboardingUseCase: ProcessOnboardingEventUseCase
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
    const retryExchange = 'dlx.onboarding.retry';
    const retryQueue10s = 'q.user.onboarding.retry.10s';

    await this.channel.assertExchange(retryExchange, 'direct', { durable: true });
    await this.channel.assertExchange(dlxExchange, 'direct', { durable: true });

    await this.channel.assertQueue(dlxQueue, { durable: true });
    await this.channel.bindQueue(dlxQueue, dlxExchange, 'dlq.onboarding');

    // 10-second delayed retry queue re-routing back to primary exchange
    await this.channel.assertQueue(retryQueue10s, {
      durable: true,
      arguments: {
        'x-message-ttl': 10000,
        'x-dead-letter-exchange': exchange,
        'x-dead-letter-routing-key': queue,
      },
    });
    await this.channel.bindQueue(retryQueue10s, retryExchange, 'retry.onboarding');

    // 3. Assert Primary Queue with DLX configuration
    await this.channel.assertQueue(queue, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': retryExchange,
        'x-dead-letter-routing-key': 'retry.onboarding',
      },
    });

    // Bind canonical user.registered routing key to q.user.onboarding
    await this.channel.bindQueue(queue, exchange, 'user.registered');

    logger.info({ queue, exchange }, `Bound queue [${queue}] to exchange [${exchange}]`);

    // 4. Start Consumer Loop
    await this.channel.consume(queue, async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      try {
        const content = msg.content.toString();
        const envelope = JSON.parse(content);
        const correlationId = envelope.correlationId || envelope.payload?.correlationId || envelope.eventId;

        logger.info(
          {
            eventId: envelope.eventId,
            eventName: envelope.eventName,
            correlationId,
          },
          `Processing onboarding event [${envelope.eventName || 'unknown'}]`
        );

        const result = await this.processOnboardingUseCase.execute(envelope);

        if (result.success) {
          this.channel?.ack(msg);
        }
      } catch (err: any) {
        const deathCount = this.getDeathCount(msg);
        logger.error({ attempt: deathCount + 1, error: err }, `Processing error (attempt ${deathCount + 1})`);

        if (deathCount >= 3) {
          logger.warn({ dlxQueue }, `Exceeded max retries (3). Routing event to DLQ: ${dlxQueue}`);
          this.channel?.publish(dlxExchange, 'dlq.onboarding', msg.content, { persistent: true });
          this.channel?.ack(msg);
        } else {
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
