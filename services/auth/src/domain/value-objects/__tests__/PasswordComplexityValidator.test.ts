import { PasswordComplexityValidator } from '../PasswordComplexityValidator.vo';

describe('PasswordComplexityValidator', () => {
  describe('valid passwords', () => {
    it('should accept a strong password with all requirements', () => {
      const result = PasswordComplexityValidator.validate('StrongP@ss1');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept a complex password with multiple special chars', () => {
      const result = PasswordComplexityValidator.validate('My$ecure!Pass99');
      expect(result.isValid).toBe(true);
    });

    it('should accept exactly 8 characters meeting all criteria', () => {
      const result = PasswordComplexityValidator.validate('P@ssw0rd');
      expect(result.isValid).toBe(true);
    });
  });

  describe('invalid passwords — minimum length', () => {
    it('should reject empty string', () => {
      const result = PasswordComplexityValidator.validate('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('8 characters');
    });

    it('should reject a password shorter than 8 characters', () => {
      const result = PasswordComplexityValidator.validate('P@ss1');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('8 characters');
    });

    it('should reject a 7-character password even with all types', () => {
      const result = PasswordComplexityValidator.validate('Pa$s1XY'); // 7 chars
      expect(result.isValid).toBe(false);
    });
  });

  describe('invalid passwords — missing character types', () => {
    it('should reject a password with no uppercase letter', () => {
      const result = PasswordComplexityValidator.validate('nouppercase1!');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('uppercase letter');
    });

    it('should reject a password with no lowercase letter', () => {
      const result = PasswordComplexityValidator.validate('NOLOWERCASE1!');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('lowercase letter');
    });

    it('should reject a password with no numbers', () => {
      const result = PasswordComplexityValidator.validate('NoNumbers!Only');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('number');
    });

    it('should reject a password with no special character', () => {
      const result = PasswordComplexityValidator.validate('NoSpecialChar1');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('special character');
    });

    it('should reject a purely numeric password', () => {
      const result = PasswordComplexityValidator.validate('12345678901');
      expect(result.isValid).toBe(false);
    });

    it('should reject a purely alphabetic password', () => {
      const result = PasswordComplexityValidator.validate('OnlyAlphaChars');
      expect(result.isValid).toBe(false);
    });
  });
});
