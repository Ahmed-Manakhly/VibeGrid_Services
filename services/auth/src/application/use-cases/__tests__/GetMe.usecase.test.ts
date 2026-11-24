import { GetMeUseCase } from '../GetMe.usecase';
import { IUserAuthRepository } from '../../../domain/ports/IUserAuthRepository';
import { UserAuth } from '../../../domain/entities/UserAuth.entity';
import { UserNotFoundError } from '../../errors/errors';

describe('GetMeUseCase', () => {
  let mockUserAuthRepo: jest.Mocked<IUserAuthRepository>;
  let getMeUseCase: GetMeUseCase;

  beforeEach(() => {
    mockUserAuthRepo = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByProvider: jest.fn(),
      findFirstByRole: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      update: jest.fn()
    };
    getMeUseCase = new GetMeUseCase(mockUserAuthRepo);
  });

  it('should return user profile if found', async () => {
    const user = UserAuth.create({
      email: 'dev@vibegrid.tech',
      name: 'Developer'
    });
    mockUserAuthRepo.findById.mockResolvedValue(user);

    const result = await getMeUseCase.execute('user_123');

    expect(mockUserAuthRepo.findById).toHaveBeenCalledWith('user_123');
    expect(result.email).toBe('dev@vibegrid.tech');
    expect(result.name).toBe('Developer');
  });

  it('should throw UserNotFoundError if user is not found', async () => {
    mockUserAuthRepo.findById.mockResolvedValue(null);

    await expect(getMeUseCase.execute('non_existent')).rejects.toThrow(UserNotFoundError);
    expect(mockUserAuthRepo.findById).toHaveBeenCalledWith('non_existent');
  });
});

