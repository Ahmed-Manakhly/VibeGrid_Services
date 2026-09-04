import { RedisPresenceRepository } from '../src/infrastructure/persistence/RedisPresenceRepository';

describe('Realtime Gateway — Multi-Device Presence Tracking Tests', () => {
  let presenceRepo: RedisPresenceRepository;
  let mockRedisStorage: Map<string, Map<string, string>>;

  beforeEach(() => {
    mockRedisStorage = new Map();

    const mockRedisClient = {
      hlen: jest.fn().mockImplementation(async (key: string) => {
        const hash = mockRedisStorage.get(key);
        return hash ? hash.size : 0;
      }),
      hset: jest.fn().mockImplementation(async (key: string, field: string, val: string) => {
        if (!mockRedisStorage.has(key)) {
          mockRedisStorage.set(key, new Map());
        }
        mockRedisStorage.get(key)!.set(field, val);
        return 1;
      }),
      hdel: jest.fn().mockImplementation(async (key: string, field: string) => {
        const hash = mockRedisStorage.get(key);
        if (hash && hash.has(field)) {
          hash.delete(field);
          return 1;
        }
        return 0;
      }),
      expire: jest.fn().mockResolvedValue(1),
      del: jest.fn().mockImplementation(async (key: string) => {
        mockRedisStorage.delete(key);
        return 1;
      }),
    } as any;

    presenceRepo = new RedisPresenceRepository(mockRedisClient);
  });

  it('should transition to ONLINE state on first device connection', async () => {
    const res = await presenceRepo.addConnection('user_alpha', 'socket_11');
    expect(res.isStateChange).toBe(true);
    expect(res.online).toBe(true);
    expect(res.connectionCount).toBe(1);
  });

  it('should remain ONLINE without state change when second device connects', async () => {
    await presenceRepo.addConnection('user_alpha', 'socket_11');
    const res2 = await presenceRepo.addConnection('user_alpha', 'socket_22');

    expect(res2.isStateChange).toBe(false);
    expect(res2.online).toBe(true);
    expect(res2.connectionCount).toBe(2);
  });

  it('should remain ONLINE when one of two devices disconnects', async () => {
    await presenceRepo.addConnection('user_alpha', 'socket_11');
    await presenceRepo.addConnection('user_alpha', 'socket_22');

    const resDisc1 = await presenceRepo.removeConnection('user_alpha', 'socket_11');
    expect(resDisc1.isStateChange).toBe(false);
    expect(resDisc1.online).toBe(true);
    expect(resDisc1.connectionCount).toBe(1);
  });

  it('should transition to OFFLINE state when final device disconnects', async () => {
    await presenceRepo.addConnection('user_alpha', 'socket_11');
    await presenceRepo.addConnection('user_alpha', 'socket_22');
    await presenceRepo.removeConnection('user_alpha', 'socket_11');

    const resDisc2 = await presenceRepo.removeConnection('user_alpha', 'socket_22');
    expect(resDisc2.isStateChange).toBe(true);
    expect(resDisc2.online).toBe(false);
    expect(resDisc2.connectionCount).toBe(0);
  });

  it('should report correct status via getUserStatus', async () => {
    const offlineStatus = await presenceRepo.getUserStatus('user_beta');
    expect(offlineStatus.online).toBe(false);

    await presenceRepo.addConnection('user_beta', 'socket_99');
    const onlineStatus = await presenceRepo.getUserStatus('user_beta');
    expect(onlineStatus.online).toBe(true);
    expect(onlineStatus.connectionCount).toBe(1);
  });
});
