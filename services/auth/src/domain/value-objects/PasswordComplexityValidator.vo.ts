export class PasswordComplexityValidator {
  private static MIN_LENGTH = 8;

  public static validate(password: string): { isValid: boolean; error?: string } {
    if (!password || password.length < this.MIN_LENGTH) {
      return {
        isValid: false,
        error: `Password must be at least ${this.MIN_LENGTH} characters long.`
      };
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      return {
        isValid: false,
        error: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
      };
    }

    return { isValid: true };
  }
}
