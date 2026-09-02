import { VerifyEmailUseCase } from '../VerifyEmail.usecase';
import { SendEmailVerificationTokenUseCase } from '../SendEmailVerificationToken.usecase';
import { UserAuth } from '../../../domain/entities/UserAuth.entity';
import { EmailToken } from '../../../domain/entities/EmailToken.entity';
import { ValidationError, UserNotFoundError } from '../../errors/errors';
import crypto from 'crypto';

describe('VerifyEmailUseCase & SendEmailVerificationTokenUseCase', () => {
  let mockUserAuthRepo: any;
  let mockEmailTokenRepo: any;
  let mockEmailSender: any;

  let verifyEmailUseCase: VerifyEmailUseCase;
  let sendEmailVerificationTokenUseCase: SendEmailVerificationTokenUseCase;

  beforeEach(() => {
    mockUserAuthRepo = {
      findByEmail: jest.fn(),
      save: jest.fn().mockImplementation((user) => Promise.resolve(user))
    };

    mockEmailTokenRepo = {
      findByEmail: jest.fn(),
      upsert: jest.fn().mockImplementation((token) => Promise.resolve(token)),
      deleteByEmail: jest.fn().mockResolvedValue(undefined)
    };

    mockEmailSender = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
      sendEmailVerification: jest.fn().mockResolvedValue(undefined)
    };

    verifyEmailUseCase = new VerifyEmailUseCase(mockUserAuthRepo, mockEmailTokenRepo);
    sendEmailVerificationTokenUseCase = new SendEmailVerificationTokenUseCase(
      mockUserAuthRepo,
      mockEmailTokenRepo,
      mockEmailSender
    );
  });

  describe('VerifyEmailUseCase', () => {
    it('should verify email successfully with valid OTP hash match', async () => {
      const user = UserAuth.create({
        id: 'u1',
        email: 'user@example.com',
        isEmailVerified: false
      });

      const rawOtp = '123456';
      const tokenHash = crypto.createHash('sha256').update(rawOtp).digest('hex');

      const tokenDoc = EmailToken.create({
        email: 'user@example.com',
        tokenHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      });

      mockUserAuthRepo.findByEmail.mockResolvedValue(user);
      mockEmailTokenRepo.findByEmail.mockResolvedValue(tokenDoc);

      const result = await verifyEmailUseCase.execute({
        email: 'USER@example.com ',
        otp: '123456'
      });

      expect(result.message).toBe('Email verified successfully');
      expect(user.isEmailVerified).toBe(true);
      expect(user.emailVerifiedAt).toBeDefined();
      expect(mockUserAuthRepo.save).toHaveBeenCalledWith(user);
      expect(mockEmailTokenRepo.deleteByEmail).toHaveBeenCalledWith('user@example.com');
    });

    it('should throw ValidationError for invalid OTP code', async () => {
      const user = UserAuth.create({
        id: 'u1',
        email: 'user@example.com',
        isEmailVerified: false
      });

      const tokenHash = crypto.createHash('sha256').update('123456').digest('hex');

      const tokenDoc = EmailToken.create({
        email: 'user@example.com',
        tokenHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      });

      mockUserAuthRepo.findByEmail.mockResolvedValue(user);
      mockEmailTokenRepo.findByEmail.mockResolvedValue(tokenDoc);

      await expect(
        verifyEmailUseCase.execute({
          email: 'user@example.com',
          otp: '999999'
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if OTP code has expired', async () => {
      const user = UserAuth.create({
        id: 'u1',
        email: 'user@example.com',
        isEmailVerified: false
      });

      const tokenHash = crypto.createHash('sha256').update('123456').digest('hex');

      const tokenDoc = EmailToken.create({
        email: 'user@example.com',
        tokenHash,
        expiresAt: new Date(Date.now() - 1000) // Expired
      });

      mockUserAuthRepo.findByEmail.mockResolvedValue(user);
      mockEmailTokenRepo.findByEmail.mockResolvedValue(tokenDoc);

      await expect(
        verifyEmailUseCase.execute({
          email: 'user@example.com',
          otp: '123456'
        })
      ).rejects.toThrow(ValidationError);

      expect(mockEmailTokenRepo.deleteByEmail).toHaveBeenCalledWith('user@example.com');
    });
  });

  describe('SendEmailVerificationTokenUseCase', () => {
    it('should generate hashed OTP token and send verification email', async () => {
      const user = UserAuth.create({
        id: 'u1',
        email: 'user@example.com',
        isEmailVerified: false
      });

      mockUserAuthRepo.findByEmail.mockResolvedValue(user);
      mockEmailTokenRepo.findByEmail.mockResolvedValue(null);

      const result = await sendEmailVerificationTokenUseCase.execute({
        email: 'user@example.com'
      });

      expect(result.message).toBe('Verification OTP code sent to your email');
      expect(mockEmailTokenRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'user@example.com',
          tokenHash: expect.any(String)
        })
      );

      const storedToken: EmailToken = mockEmailTokenRepo.upsert.mock.calls[0][0];
      expect(storedToken.tokenHash).not.toEqual('123456'); // Ensure plaintext OTP is NOT stored

      expect(mockEmailSender.sendEmailVerification).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          otp: expect.any(String)
        })
      );
    });

    it('should enforce 60-second rate limiting on resend requests', async () => {
      const user = UserAuth.create({
        id: 'u1',
        email: 'user@example.com',
        isEmailVerified: false
      });

      const recentToken = EmailToken.create({
        email: 'user@example.com',
        tokenHash: 'hashed_otp',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        createdAt: new Date(Date.now() - 10000) // Created 10 seconds ago
      });

      mockUserAuthRepo.findByEmail.mockResolvedValue(user);
      mockEmailTokenRepo.findByEmail.mockResolvedValue(recentToken);

      await expect(
        sendEmailVerificationTokenUseCase.execute({
          email: 'user@example.com'
        })
      ).rejects.toThrow(ValidationError);
    });
  });
});
