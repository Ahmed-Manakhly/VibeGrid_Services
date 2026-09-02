import { loadAndValidateConfig } from '../env';

describe('loadAndValidateConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should load default development configuration correctly', () => {
    process.env.NODE_ENV = 'development';
    const config = loadAndValidateConfig();

    expect(config.nodeEnv).toBe('development');
    expect(config.port).toBeDefined();
    expect(config.mongoUri).toBeDefined();
    expect(config.rabbitmqUrl).toBeDefined();
  });

  it('should throw an error in production if MONGO_URI is missing', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.MONGO_URI;

    expect(() => loadAndValidateConfig()).toThrow('[Config Error] MONGO_URI is required in production environment');
  });

  it('should load default token expiration configuration correctly', () => {
    process.env.NODE_ENV = 'development';
    const config = loadAndValidateConfig();

    expect(config.tokenExpiry.accessTokenExpiresInSec).toBe(900);
    expect(config.tokenExpiry.refreshTokenExpiresInSec).toBe(604800);
    expect(config.tokenExpiry.accessTokenMaxAgeMs).toBe(900000);
    expect(config.tokenExpiry.refreshTokenMaxAgeMs).toBe(604800000);
  });

  it('should accept custom token expiration environment variables', () => {
    process.env.NODE_ENV = 'development';
    process.env.JWT_ACCESS_TOKEN_EXPIRES_IN_SEC = '1800';
    process.env.JWT_REFRESH_TOKEN_EXPIRES_IN_SEC = '1209600';

    const config = loadAndValidateConfig();

    expect(config.tokenExpiry.accessTokenExpiresInSec).toBe(1800);
    expect(config.tokenExpiry.refreshTokenExpiresInSec).toBe(1209600);
    expect(config.tokenExpiry.accessTokenMaxAgeMs).toBe(1800000);
    expect(config.tokenExpiry.refreshTokenMaxAgeMs).toBe(1209600000);
  });

  it('should throw an error if token expiration environment variable is invalid', () => {
    process.env.NODE_ENV = 'development';
    process.env.JWT_ACCESS_TOKEN_EXPIRES_IN_SEC = 'invalid_number';

    expect(() => loadAndValidateConfig()).toThrow(
      '[Config Error] JWT_ACCESS_TOKEN_EXPIRES_IN_SEC must be a positive integer'
    );
  });
});
