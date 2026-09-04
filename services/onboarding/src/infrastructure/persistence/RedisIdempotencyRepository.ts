import { Redis } from 'ioredis';
import { IIdempotencyRepository } from '../../domain/ports/IIdempotencyRepository';

export class RedisIdempotencyRepository implements IIdempotencyRepository {
  private readonly prefix = 'idempotency:onboarding:';

  constructor(private redis: Redis) {}

  public async acquireClaim(eventId: string, claimId: string, ttlSeconds = 300): Promise<boolean> {
    const key = `${this.prefix}${eventId}`;
    const result = await this.redis.set(key, `CLAIMED:${claimId}`, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  public async markCompleted(eventId: string, claimId: string, ttlSeconds = 86400): Promise<void> {
    const key = `${this.prefix}${eventId}`;
    await this.redis.set(key, `COMPLETED:${claimId}`, 'EX', ttlSeconds);
  }

  public async releaseClaim(eventId: string, claimId: string): Promise<void> {
    const key = `${this.prefix}${eventId}`;
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    await this.redis.eval(luaScript, 1, key, `CLAIMED:${claimId}`);
  }
}
