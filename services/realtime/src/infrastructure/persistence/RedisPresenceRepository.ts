import Redis from 'ioredis';
import { IPresenceTracker, UserPresenceResult } from '@/application/ports/IPresenceTracker';

export class RedisPresenceRepository implements IPresenceTracker {
  private client: Redis;

  constructor(redisClientOrUrl: Redis | string) {
    if (typeof redisClientOrUrl === 'string') {
      this.client = new Redis(redisClientOrUrl, { maxRetriesPerRequest: 3 });
    } else {
      this.client = redisClientOrUrl;
    }
  }

  private getKey(userId: string): string {
    return `presence:user:${userId}`;
  }

  public async addConnection(userId: string, socketId: string): Promise<UserPresenceResult> {
    const key = this.getKey(userId);
    try {
      const initialCount = await this.client.hlen(key);
      await this.client.hset(key, socketId, Date.now().toString());
      await this.client.expire(key, 86400); // 24hr TTL refresh
      const newCount = await this.client.hlen(key);

      const isStateChange = initialCount === 0 && newCount > 0;
      return {
        isStateChange,
        online: true,
        connectionCount: newCount,
      };
    } catch {
      // Degraded fallback if Redis errors out
      return { isStateChange: true, online: true, connectionCount: 1 };
    }
  }

  public async removeConnection(userId: string, socketId: string): Promise<UserPresenceResult> {
    const key = this.getKey(userId);
    try {
      const initialCount = await this.client.hlen(key);
      await this.client.hdel(key, socketId);
      const remainingCount = await this.client.hlen(key);

      if (remainingCount === 0) {
        await this.client.del(key);
      }

      const isStateChange = initialCount > 0 && remainingCount === 0;
      return {
        isStateChange,
        online: remainingCount > 0,
        connectionCount: remainingCount,
      };
    } catch {
      return { isStateChange: true, online: false, connectionCount: 0 };
    }
  }

  public async getUserStatus(userId: string): Promise<{ online: boolean; connectionCount: number }> {
    const key = this.getKey(userId);
    try {
      const count = await this.client.hlen(key);
      return {
        online: count > 0,
        connectionCount: count,
      };
    } catch {
      return { online: false, connectionCount: 0 };
    }
  }
}
