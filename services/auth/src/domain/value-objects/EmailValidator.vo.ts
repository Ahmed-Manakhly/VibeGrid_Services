export class EmailValidator {
  private static EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  public static validate(email: string): { isValid: boolean; error?: string } {
    if (!email || typeof email !== 'string' || !email.trim()) {
      return {
        isValid: false,
        error: 'Email is required'
      };
    }

    const trimmed = email.trim();
    if (!this.EMAIL_REGEX.test(trimmed)) {
      return {
        isValid: false,
        error: 'Invalid email format'
      };
    }

    return { isValid: true };
  }
}
