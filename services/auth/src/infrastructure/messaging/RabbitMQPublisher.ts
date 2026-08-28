import { IEventPublisher } from '../../domain/ports/IEventPublisher';
import amqp from 'amqplib';

export class RabbitMQPublisher implements IEventPublisher {
  private connection: any = null;
  private channel: any = null;
  private exchange = 'domain.events';

  constructor(private rabbitUrl: string) {}

  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(this.rabbitUrl);
      this.channel = await this.connection.createChannel();
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

  async disconnect(): Promise<void> {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
    } catch (err) {
      // Ignore disconnect errors during process shutdown
    }
  }
}
