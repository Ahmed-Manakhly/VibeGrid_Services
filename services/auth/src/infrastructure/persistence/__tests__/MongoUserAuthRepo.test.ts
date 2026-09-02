import { MongoUserAuthRepo } from '../MongoUserAuthRepo';
import { UserAuthModel } from '../schemas/UserAuthSchema';
import { UserAuth } from '../../../domain/entities/UserAuth.entity';

jest.mock('../schemas/UserAuthSchema', () => ({
  UserAuthModel: {
    find: jest.fn(),
    countDocuments: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    create: jest.fn()
  }
}));

describe('MongoUserAuthRepo Query Features & Filtering', () => {
  let repo: MongoUserAuthRepo;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new MongoUserAuthRepo();
  });

  const mockDoc = {
    _id: '507f1f77bcf86cd799439011',
    email: 'user@example.com',
    name: 'Test User',
    role: 'CLIENT',
    isActive: true,
    provider: 'local',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  it('should construct whitelisted filter and pagination metadata correctly in findAll', async () => {
    const mockExec = jest.fn().mockResolvedValue([mockDoc]);
    const mockLimit = jest.fn().mockReturnValue({ exec: mockExec });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });

    (UserAuthModel.find as jest.Mock).mockReturnValue({ sort: mockSort });
    (UserAuthModel.countDocuments as jest.Mock).mockReturnValue({
      exec: jest.fn().mockResolvedValue(25)
    });

    const result = await repo.findAll({
      page: 2,
      limit: 10,
      search: 'test',
      role: 'CLIENT',
      isActive: 'true',
      sort: 'email:asc'
    });

    expect(UserAuthModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'CLIENT',
        isActive: true,
        $and: expect.arrayContaining([
          expect.objectContaining({
            $or: [
              { email: { $regex: 'test', $options: 'i' } },
              { name: { $regex: 'test', $options: 'i' } }
            ]
          })
        ])
      }),
      expect.any(Object)
    );

    expect(mockSort).toHaveBeenCalledWith({ email: 1 });
    expect(mockSkip).toHaveBeenCalledWith(10);
    expect(mockLimit).toHaveBeenCalledWith(10);

    expect(result.pagination).toEqual({
      total: 25,
      page: 2,
      limit: 10,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: true
    });
  });

  it('should enforce safe limit bounds and default pagination', async () => {
    const mockExec = jest.fn().mockResolvedValue([]);
    const mockLimit = jest.fn().mockReturnValue({ exec: mockExec });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });

    (UserAuthModel.find as jest.Mock).mockReturnValue({ sort: mockSort });
    (UserAuthModel.countDocuments as jest.Mock).mockReturnValue({
      exec: jest.fn().mockResolvedValue(0)
    });

    const result = await repo.findAll({ limit: 500 }); // Exceeds max 100 limit

    expect(mockLimit).toHaveBeenCalledWith(100);
    expect(result.pagination.limit).toBe(100);
  });

  it('should ignore non-whitelisted role filters', async () => {
    const mockExec = jest.fn().mockResolvedValue([]);
    const mockLimit = jest.fn().mockReturnValue({ exec: mockExec });
    const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });

    (UserAuthModel.find as jest.Mock).mockReturnValue({ sort: mockSort });
    (UserAuthModel.countDocuments as jest.Mock).mockReturnValue({
      exec: jest.fn().mockResolvedValue(0)
    });

    await repo.findAll({ role: 'HACKER_ROLE_INJECTION' });

    const filterPassed = (UserAuthModel.find as jest.Mock).mock.calls[0][0];
    expect(filterPassed.role).toBeUndefined();
  });
});
