import { RegisterUserUseCase } from '../RegisterUser.usecase';
import { IUserAuthRepository } from '../../../domain/ports/IUserAuthRepository';
import { IPasswordHasher } from '../../../domain/ports/IPasswordHasher';
import { IEventPublisher } from '../../../domain/ports/IEventPublisher';
import { IEmailVerificationService } from '../../../domain/ports/IEmailVerificationService';
import { UserAuth } from '../../../domain/entities/UserAuth.entity';
import { ValidationError, DuplicateEmailError } from '../../errors/errors';

describe('RegisterUserUseCase', () => {
  let mockUserAuthRepo: jest.Mocked<IUserAuthRepository>;
  let mockHasher: jest.Mocked<IPasswordHasher>;
  let mockEventPublisher: jest.Mocked<IEventPublisher>;
  let mockEmailVerificationService: jest.Mocked<IEmailVerificationService>;
  let registerUserUseCase: RegisterUserUseCase;

  beforeEach(() => {
    mockUserAuthRepo = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByProvider: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      update: jest.fn()
    };

    mockHasher = {
      hash: jest.fn().mockResolvedValue('hashed_password_123'),
      verify: jest.fn()
    };

    mockEventPublisher = {
      publish: jest.fn().mockResolvedValue(undefined)
    };

    mockEmailVerificationService = {
      execute: jest.fn().mockResolvedValue({ message: 'Verification OTP code sent to your email' })
    };

    registerUserUseCase = new RegisterUserUseCase(
      mockUserAuthRepo,
      mockHasher,
      mockEventPublisher,
      mockEmailVerificationService
    );
  });

  const validComplexPassword = 'Password123!';

  it('should successfully register a user, trigger email verification workflow, and return RegisterResultDTO', async () => {
    mockUserAuthRepo.findByEmail.mockResolvedValue(null);
    mockUserAuthRepo.save.mockImplementation(async (user: UserAuth) => {
      return UserAuth.create({
        id: 'user_123',
        email: user.email,
        passwordHash: user.passwordHash,
        name: user.name,
        role: user.role
      });
    });

    const result = await registerUserUseCase.execute({
      email: '  TEST.USER@EXAMPLE.COM  ',
      password: validComplexPassword,
      passwordConfirm: validComplexPassword,
      name: 'Test User'
    });

    expect(mockUserAuthRepo.findByEmail).toHaveBeenCalledWith('test.user@example.com');
    expect(mockUserAuthRepo.save).toHaveBeenCalled();
    const savedUserArg = mockUserAuthRepo.save.mock.calls[0][0];
    expect(savedUserArg.email).toBe('test.user@example.com');
    expect(savedUserArg.role).toBe('CLIENT');

    // Verification workflow triggered cleanly via application dependency
    expect(mockEmailVerificationService.execute).toHaveBeenCalledWith({
      email: 'test.user@example.com'
    });

    // Clean DTO without fake tokens
    expect(result.isVerificationRequired).toBe(true);
    expect(result.user.email).toBe('test.user@example.com');
    expect(result.user.role).toBe('CLIENT');
    expect(result.user.isEmailVerified).toBe(false);
    expect((result as any).accessToken).toBeUndefined();
    expect((result as any).refreshToken).toBeUndefined();
  });

  it('should NOT swallow email verification errors and allow exception propagation', async () => {
    mockUserAuthRepo.findByEmail.mockResolvedValue(null);
    mockUserAuthRepo.save.mockImplementation(async (user: UserAuth) => {
      return UserAuth.create({
        id: 'user_123',
        email: user.email,
        passwordHash: user.passwordHash,
        name: user.name,
        role: user.role
      });
    });

    mockEmailVerificationService.execute.mockRejectedValue(
      new Error('SMTP service unavailable')
    );

    await expect(
      registerUserUseCase.execute({
        email: 'test@example.com',
        password: validComplexPassword,
        passwordConfirm: validComplexPassword
      })
    ).rejects.toThrow('SMTP service unavailable');
  });

  it('should throw ValidationError if password and passwordConfirm do not match', async () => {
    await expect(
      registerUserUseCase.execute({
        email: 'test@example.com',
        password: validComplexPassword,
        passwordConfirm: 'DifferentPassword123!'
      })
    ).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError if password fails complexity validation', async () => {
    await expect(
      registerUserUseCase.execute({
        email: 'test@example.com',
        password: 'simple',
        passwordConfirm: 'simple'
      })
    ).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError if client attempts self-assignment of ADMIN role', async () => {
    await expect(
      registerUserUseCase.execute({
        email: 'test@example.com',
        password: validComplexPassword,
        passwordConfirm: validComplexPassword,
        role: 'ADMIN'
      })
    ).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError if client attempts self-assignment of EMPLOYEE role', async () => {
    await expect(
      registerUserUseCase.execute({
        email: 'test@example.com',
        password: validComplexPassword,
        passwordConfirm: validComplexPassword,
        role: 'EMPLOYEE'
      })
    ).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError if email is malformed', async () => {
    await expect(
      registerUserUseCase.execute({
        email: 'invalid-email-format',
        password: validComplexPassword,
        passwordConfirm: validComplexPassword
      })
    ).rejects.toThrow(ValidationError);
  });

  it('should throw DuplicateEmailError if normalized email is already registered', async () => {
    mockUserAuthRepo.findByEmail.mockResolvedValue(
      UserAuth.create({ id: 'existing_1', email: 'test@example.com' })
    );

    await expect(
      registerUserUseCase.execute({
        email: 'Test@Example.Com',
        password: validComplexPassword,
        passwordConfirm: validComplexPassword
      })
    ).rejects.toThrow(DuplicateEmailError);

    expect(mockUserAuthRepo.findByEmail).toHaveBeenCalledWith('test@example.com');
  });
});
