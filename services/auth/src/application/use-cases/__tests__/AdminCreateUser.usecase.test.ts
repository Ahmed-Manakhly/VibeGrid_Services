import { AdminCreateUserUseCase } from '../AdminCreateUser.usecase';
import { IUserAuthRepository } from '../../../domain/ports/IUserAuthRepository';
import { IPasswordHasher } from '../../../domain/ports/IPasswordHasher';
import { UserAuth } from '../../../domain/entities/UserAuth.entity';
import { ValidationError, DuplicateEmailError } from '../../errors/errors';

describe('AdminCreateUserUseCase — Email Validation & Creation', () => {
  let mockUserAuthRepo: jest.Mocked<IUserAuthRepository>;
  let mockHasher: jest.Mocked<IPasswordHasher>;
  let adminCreateUserUseCase: AdminCreateUserUseCase;

  beforeEach(() => {
    mockUserAuthRepo = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByProvider: jest.fn(),
      findFirstByRole: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn().mockImplementation(async (user: UserAuth) => user),
      update: jest.fn()
    };

    mockHasher = {
      hash: jest.fn().mockResolvedValue('hashed_pass'),
      verify: jest.fn()
    };

    adminCreateUserUseCase = new AdminCreateUserUseCase(mockUserAuthRepo, mockHasher);
  });

  const validPassword = 'Password123!';

  it('should successfully create user with normalized email when email is valid', async () => {
    mockUserAuthRepo.findByEmail.mockResolvedValue(null);

    const user = await adminCreateUserUseCase.execute({
      email: '   NEW.USER@EXAMPLE.COM   ',
      password: validPassword,
      name: 'New User'
    });

    expect(mockUserAuthRepo.findByEmail).toHaveBeenCalledWith('new.user@example.com');
    expect(user.email).toBe('new.user@example.com');
  });

  it('should throw ValidationError if email format is malformed', async () => {
    await expect(
      adminCreateUserUseCase.execute({
        email: 'malformed-email-address',
        password: validPassword
      })
    ).rejects.toThrow(ValidationError);
  });

  it('should throw DuplicateEmailError if email is already taken', async () => {
    mockUserAuthRepo.findByEmail.mockResolvedValue(
      UserAuth.create({ id: '1', email: 'taken@example.com' })
    );

    await expect(
      adminCreateUserUseCase.execute({
        email: 'taken@example.com',
        password: validPassword
      })
    ).rejects.toThrow(DuplicateEmailError);
  });
});
