import { IUserAuthRepository } from '../../domain/ports/IUserAuthRepository';
import { IPasswordHasher } from '../../domain/ports/IPasswordHasher';
import { UserAuth } from '../../domain/entities/UserAuth.entity';
import { PasswordComplexityValidator } from '../../domain/value-objects/PasswordComplexityValidator.vo';
import { EmailValidator } from '../../domain/value-objects/EmailValidator.vo';

export interface AdminCreateUserInputDTO {
  email: string;
  password: string;
  name?: string;
  role?: string;
  isActive?: boolean;
  isEmailVerified?: boolean;
}

import { DuplicateEmailError, ValidationError } from '../errors/errors';

export class AdminCreateUserUseCase {
  constructor(
    private userAuthRepo: IUserAuthRepository,
    private hasher: IPasswordHasher
  ) {}

  public async execute(input: AdminCreateUserInputDTO): Promise<UserAuth> {
    if (!input.email) {
      throw new ValidationError('Email is required');
    }

    const normalizedEmail = input.email.trim().toLowerCase();

    const emailValidation = EmailValidator.validate(normalizedEmail);
    if (!emailValidation.isValid) {
      throw new ValidationError(emailValidation.error || 'Invalid email format');
    }

    const existing = await this.userAuthRepo.findByEmail(normalizedEmail);
    if (existing) {
      throw new DuplicateEmailError('User with this email already exists');
    }

    const validation = PasswordComplexityValidator.validate(input.password);
    if (!validation.isValid) {
      throw new ValidationError(validation.error || 'Password does not meet security criteria');
    }

    const passwordHash = await this.hasher.hash(input.password);

    const user = UserAuth.create({
      email: normalizedEmail,
      passwordHash,
      name: input.name,
      role: input.role || 'USER',
      isActive: input.isActive !== undefined ? input.isActive : true,
      isEmailVerified: input.isEmailVerified !== undefined ? input.isEmailVerified : false,
      provider: 'local'
    });

    return await this.userAuthRepo.save(user);
  }
}
