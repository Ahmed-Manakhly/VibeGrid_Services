import { Redis } from 'ioredis';
import { IIdempotencyRepository } from '../../domain/ports/IIdempotencyRepository';

export class RedisIdempotencyRepository implements IIdempotencyRepository {
  constructor(private redis: Redis) {}

  public async acquireClaim(eventId: string, claimId: string, ttlSeconds: number = 300): Promise<boolean> {
    const key = `idempotency:email:${eventId}`;
    const value = `PROCESSING:${claimId}`;
    
    // SET key value NX EX ttlSeconds
    const result = await this.redis.set(key, value, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  public async markCompleted(eventId: string, claimId: string, ttlSeconds: number = 86400): Promise<void> {
    const key = `idempotency:email:${eventId}`;
    const value = `COMPLETED:${claimId}`;
    
    await this.redis.set(key, value, 'EX', ttlSeconds);
  }

  public async releaseClaim(eventId: string, claimId: string): Promise<void> {
    const key = `idempotency:email:${eventId}`;
    
    // Owner-safe release via Lua script (only delete if current value matches processing claimId)
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    const expectedValue = `PROCESSING:${claimId}`;
    await this.redis.eval(luaScript, 1, key, expectedValue);
  }
}
