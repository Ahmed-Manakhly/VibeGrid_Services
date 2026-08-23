import { IUserAuthRepository } from '../../domain/ports/IUserAuthRepository';
import { IRevokedTokenRepository } from '../../domain/ports/IRevokedTokenRepository';

export interface ValidateTokenGuardInput {
  token: string;
  userId: string;
  decodedRole: string;
  tokenIat: number; // Issued at timestamp in seconds
}

export interface ValidateTokenGuardResult {
  isValid: boolean;
  reason?: string;
}

export class ValidateTokenGuardUseCase {
  constructor(
    private userAuthRepo: IUserAuthRepository,
    private revokedTokenRepo: IRevokedTokenRepository
  ) {}

  public async execute(input: ValidateTokenGuardInput): Promise<ValidateTokenGuardResult> {
    // 1. Check if token was explicitly revoked
    const isRevoked = await this.revokedTokenRepo.isRevoked(input.token);
    if (isRevoked) {
      return { isValid: false, reason: 'This session has been revoked. Please login again.' };
    }

    // 2. Fetch user to check current status
    const user = await this.userAuthRepo.findById(input.userId);
    if (!user) {
      return { isValid: false, reason: 'User no longer exists.' };
    }

    // 3. Check if account is active
    if (!user.isActive) {
      return { isValid: false, reason: 'User account is locked. Please contact support.' };
    }

    // 4. Check if password changed after token was issued
    if (user.passwordChangedAt) {
      const passwordChangedTimeSec = Math.floor(user.passwordChangedAt.getTime() / 1000);
      if (input.tokenIat < passwordChangedTimeSec) {
        return { isValid: false, reason: 'Password was changed recently. Please login again.' };
      }
    }

    // 5. Check if user role changed
    if (user.role !== input.decodedRole) {
      return { isValid: false, reason: 'User role has changed. Please login again.' };
    }

    return { isValid: true };
  }
}
