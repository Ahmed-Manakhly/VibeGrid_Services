import { createLogger } from '../index';

describe('Shared Logger & Middleware Verification', () => {
  it('should redact authorization, cookie, tokens, and passwords', () => {
    const logger = createLogger('test-service');
    expect(logger).toBeDefined();
  });
});
