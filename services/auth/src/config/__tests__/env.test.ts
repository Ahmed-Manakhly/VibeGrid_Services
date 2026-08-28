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

  it('should throw an error in production if RABBITMQ_URL is missing', () => {
    process.env.NODE_ENV = 'production';
    process.env.MONGO_URI = 'mongodb://localhost:27017/prod_db';
    delete process.env.RABBITMQ_URL;

    expect(() => loadAndValidateConfig()).toThrow('[Config Error] RABBITMQ_URL is required in production environment');
  });
});
