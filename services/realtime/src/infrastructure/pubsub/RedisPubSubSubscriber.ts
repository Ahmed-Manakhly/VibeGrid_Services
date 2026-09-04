import Redis from 'ioredis';
import { IRealtimeGateway } from '@/application/ports/IRealtimeGateway';
import { PinoRealtimeLogger } from '../logging/PinoRealtimeLogger';

export class RedisPubSubSubscriber {
  private subscriberClient: Redis | null = null;
  private publisherClient: Redis | null = null;
  private logger: PinoRealtimeLogger;

  constructor(
    private redisUrl: string,
    private realtimeGateway: IRealtimeGateway,
    logger?: PinoRealtimeLogger
  ) {
    this.logger = logger || new PinoRealtimeLogger('vibegrid-realtime-pubsub');
  }

  public async start(): Promise<void> {
    this.subscriberClient = new Redis(this.redisUrl, { maxRetriesPerRequest: 3 });
    this.publisherClient = new Redis(this.redisUrl, { maxRetriesPerRequest: 3 });

    this.subscriberClient.on('error', (err) => {
      this.logger.error('[RedisPubSubSubscriber] Redis Subscriber Error', { error: err.message });
    });

    await this.subscriberClient.subscribe('realtime:notification', 'realtime:feed', 'realtime:presence');
    this.logger.info('Subscribed to Redis channels: realtime:notification, realtime:feed, realtime:presence');

    this.subscriberClient.on('message', (channel, message) => {
      try {
        const payload = JSON.parse(message);

        if (channel === 'realtime:notification') {
          const { userId, notification } = payload;
          if (userId && notification) {
            this.realtimeGateway.emitNotificationToUser(userId, notification);
          }
        } else if (channel === 'realtime:feed') {
          const { recipientIds, ...feedSignal } = payload;
          if (Array.isArray(recipientIds) && recipientIds.length > 0) {
            for (const recipientId of recipientIds) {
              this.realtimeGateway.emitFeedUpdateToUser(recipientId, feedSignal as any);
            }
          } else if (payload.userId) {
            this.realtimeGateway.emitFeedUpdateToUser(payload.userId, feedSignal as any);
          }
        } else if (channel === 'realtime:presence') {
          if (payload.userId && payload.status) {
            this.realtimeGateway.broadcastPresence(payload);
          }
        }
      } catch (err: any) {
        this.logger.error('[RedisPubSubSubscriber] Error processing Pub/Sub message', { channel, error: err.message });
      }
    });
  }

  public async publish(channel: string, messagePayload: any): Promise<number> {
    if (!this.publisherClient) {
      this.publisherClient = new Redis(this.redisUrl, { maxRetriesPerRequest: 3 });
    }
    const serialized = typeof messagePayload === 'string' ? messagePayload : JSON.stringify(messagePayload);
    return await this.publisherClient.publish(channel, serialized);
  }

  public async stop(): Promise<void> {
    if (this.subscriberClient) {
      await this.subscriberClient.unsubscribe();
      this.subscriberClient.disconnect();
    }
    if (this.publisherClient) {
      this.publisherClient.disconnect();
    }
    this.logger.info('[RedisPubSubSubscriber] Stopped Redis Pub/Sub subscriber');
  }
}
