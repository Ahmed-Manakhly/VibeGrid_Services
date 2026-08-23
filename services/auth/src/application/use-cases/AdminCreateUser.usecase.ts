import { IUserAuthRepository } from '../../domain/ports/IUserAuthRepository';
import { IPasswordHasher } from '../../domain/ports/IPasswordHasher';
import { UserAuth } from '../../domain/entities/UserAuth.entity';
import { PasswordComplexityValidator } from '../../domain/value-objects/PasswordComplexityValidator.vo';

export interface AdminCreateUserInputDTO {
  email: string;
  password: string;
  name?: string;
  role?: string;
  isActive?: boolean;
}

export class AdminCreateUserUseCase {
  constructor(
    private userAuthRepo: IUserAuthRepository,
    private hasher: IPasswordHasher
  ) {}

  public async execute(input: AdminCreateUserInputDTO): Promise<UserAuth> {
    const existing = await this.userAuthRepo.findByEmail(input.email);
    if (existing) {
      throw new Error('User with this email already exists');
    }

    const validation = PasswordComplexityValidator.validate(input.password);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Password does not meet security criteria');
    }

    const passwordHash = await this.hasher.hash(input.password);

    const user = UserAuth.create({
      email: input.email.toLowerCase().trim(),
      passwordHash,
      name: input.name,
      role: input.role || 'USER',
      isActive: input.isActive !== undefined ? input.isActive : true,
      provider: 'local'
    });

    return await this.userAuthRepo.save(user);
  }
}
