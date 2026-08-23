import { IUserAuthRepository } from '../../domain/ports/IUserAuthRepository';
import { IEmailTokenRepository } from '../../domain/ports/IEmailTokenRepository';
import { IEmailSender } from '../../domain/ports/IEmailSender';
import { IPasswordHasher } from '../../domain/ports/IPasswordHasher';
import { EmailToken } from '../../domain/entities/EmailToken.entity';

export interface RequestPasswordResetInput {
  email: string;
}

export class RequestPasswordResetUseCase {
  constructor(
    private userAuthRepo: IUserAuthRepository,
    private emailTokenRepo: IEmailTokenRepository,
    private passwordHasher: IPasswordHasher,
    private emailSender: IEmailSender
  ) {}

  public async execute(input: RequestPasswordResetInput): Promise<{ message: string }> {
    const email = input.email.toLowerCase();

    // 1. Check if user exists
    const user = await this.userAuthRepo.findByEmail(email);
    if (!user) {
      // Return success to avoid email enumeration security attacks
      return { message: 'If an account exists with this email, an OTP has been sent.' };
    }

    if (!user.isActive) {
      throw new Error('Account is locked. Please contact support.');
    }

    // 2. Rate limit check: look for existing unexpired token
    const existingToken = await this.emailTokenRepo.findByEmail(email);
    if (existingToken && !existingToken.isExpired()) {
      throw new Error('OTP request already sent. Please wait before requesting again.');
    }

    // 3. Generate 4-digit OTP
    const otp = `${Math.floor(1000 + Math.random() * 9000)}`;
    const hashedOtp = await this.passwordHasher.hash(otp);

    // 4. Set 5-minute expiration
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    // 5. Save EmailToken entity
    const emailTokenEntity = EmailToken.create({
      email,
      emailToken: hashedOtp,
      expiresAt
    });

    await this.emailTokenRepo.upsert(emailTokenEntity);

    // 6. Send email with plain text OTP
    await this.emailSender.sendEmail({
      to: email,
      subject: 'Verify Your Email — Password Reset',
      html: `<h1>VibeGrid Password Reset</h1><p>Your OTP code is <b>${otp}</b>.</p><p>It expires in 5 minutes.</p>`
    });

    return { message: 'OTP sent to your email.' };
  }
}
