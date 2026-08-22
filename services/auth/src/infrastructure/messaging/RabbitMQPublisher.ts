import { IEventPublisher } from '../../domain/ports/IEventPublisher';
import amqp from 'amqplib';

export class RabbitMQPublisher implements IEventPublisher {
  private channel: amqp.Channel | null = null;
  private exchange = 'domain.events';

  constructor(private rabbitUrl: string) {}

  async connect(): Promise<void> {
    try {
      const conn = await amqp.connect(this.rabbitUrl);
      this.channel = await conn.createChannel();
      await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
      console.log('✅ Auth Service connected to RabbitMQ Exchange:', this.exchange);
    } catch (err) {
      console.error('❌ Failed to connect to RabbitMQ in Auth Service:', err);
    }
  }

  async publish(eventName: string, payload: any): Promise<void> {
    if (!this.channel) {
      console.warn('⚠️ RabbitMQ channel not initialized, skipping publish:', eventName);
      return;
    }
    const routingKey = eventName;
    const content = Buffer.from(JSON.stringify(payload));
    this.channel.publish(this.exchange, routingKey, content, { persistent: true });
    console.log(`📡 Published [${routingKey}] to exchange [${this.exchange}]`);
  }
}
