import { EmailValidator } from '../EmailValidator.vo';

describe('EmailValidator VO', () => {
  it('should return isValid=true for standard valid email addresses', () => {
    expect(EmailValidator.validate('user@example.com').isValid).toBe(true);
    expect(EmailValidator.validate('john.doe+test@domain.co.uk').isValid).toBe(true);
    expect(EmailValidator.validate('   admin@vibegrid.io   ').isValid).toBe(true);
  });

  it('should return isValid=false for malformed email addresses', () => {
    expect(EmailValidator.validate('not-an-email').isValid).toBe(false);
    expect(EmailValidator.validate('missing@domain').isValid).toBe(false);
    expect(EmailValidator.validate('@missingusername.com').isValid).toBe(false);
    expect(EmailValidator.validate('spaces in@email.com').isValid).toBe(false);
  });

  it('should return isValid=false for empty or null inputs', () => {
    expect(EmailValidator.validate('').isValid).toBe(false);
    expect(EmailValidator.validate('   ').isValid).toBe(false);
    expect(EmailValidator.validate(null as any).isValid).toBe(false);
  });
});
