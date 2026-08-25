import { UserAuth } from '../UserAuth.entity';

describe('UserAuth Entity', () => {
  describe('create()', () => {
    it('should create a user with default role USER', () => {
      const user = UserAuth.create({ email: 'test@example.com' });
      expect(user.role).toBe('USER');
    });

    it('should create a user with default isActive=true', () => {
      const user = UserAuth.create({ email: 'test@example.com' });
      expect(user.isActive).toBe(true);
    });

    it('should create a user with default provider=local', () => {
      const user = UserAuth.create({ email: 'test@example.com' });
      expect(user.provider).toBe('local');
    });

    it('should preserve email exactly', () => {
      const user = UserAuth.create({ email: 'ahmed@vibegrid.com' });
      expect(user.email).toBe('ahmed@vibegrid.com');
    });

    it('should allow ADMIN role override', () => {
      const user = UserAuth.create({ email: 'admin@vibegrid.com', role: 'ADMIN' });
      expect(user.role).toBe('ADMIN');
    });

    it('should allow isActive=false (locked account)', () => {
      const user = UserAuth.create({ email: 'locked@vibegrid.com', isActive: false });
      expect(user.isActive).toBe(false);
    });

    it('should not expose passwordHash in creation without it', () => {
      const user = UserAuth.create({ email: 'test@example.com' });
      expect(user.passwordHash).toBeUndefined();
    });

    it('should store passwordHash when provided', () => {
      const user = UserAuth.create({ email: 'test@example.com', passwordHash: '$argon2id$v=19$...' });
      expect(user.passwordHash).toBe('$argon2id$v=19$...');
    });

    it('should allow OAuth providers (google)', () => {
      const user = UserAuth.create({ email: 'oauth@vibegrid.com', provider: 'google', providerId: 'google-123' });
      expect(user.provider).toBe('google');
      expect(user.providerId).toBe('google-123');
    });
  });

  describe('updatePassword()', () => {
    it('should update passwordHash and set passwordChangedAt', () => {
      const user = UserAuth.create({ email: 'test@example.com', passwordHash: 'old_hash' });
      const before = new Date();
      user.updatePassword('new_hash');
      expect(user.passwordHash).toBe('new_hash');
      expect(user.passwordChangedAt).toBeDefined();
      expect(user.passwordChangedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should accept a custom changedAt date', () => {
      const user = UserAuth.create({ email: 'test@example.com' });
      const specificDate = new Date('2026-01-01T00:00:00Z');
      user.updatePassword('new_hash', specificDate);
      expect(user.passwordChangedAt).toEqual(specificDate);
    });
  });

  describe('passwordChangedAt invalidation guard logic', () => {
    it('should detect token issued before passwordChangedAt (token must be revoked)', () => {
      const tokenIssuedAt = new Date('2026-06-01T10:00:00Z').getTime() / 1000;
      const passwordChangedAt = new Date('2026-06-01T11:00:00Z'); // changed AFTER token issued

      const user = UserAuth.create({ email: 'test@example.com', passwordChangedAt });
      const isTokenStale = user.passwordChangedAt
        ? tokenIssuedAt < user.passwordChangedAt.getTime() / 1000
        : false;

      expect(isTokenStale).toBe(true);
    });

    it('should allow a token issued AFTER passwordChangedAt', () => {
      const passwordChangedAt = new Date('2026-06-01T10:00:00Z');
      const tokenIssuedAt = new Date('2026-06-01T11:00:00Z').getTime() / 1000; // issued AFTER change

      const user = UserAuth.create({ email: 'test@example.com', passwordChangedAt });
      const isTokenStale = user.passwordChangedAt
        ? tokenIssuedAt < user.passwordChangedAt.getTime() / 1000
        : false;

      expect(isTokenStale).toBe(false);
    });
  });
});
