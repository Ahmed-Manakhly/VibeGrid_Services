import { IUserAuthRepository } from '../../domain/ports/IUserAuthRepository';
import { IPasswordHasher } from '../../domain/ports/IPasswordHasher';
import { IEventPublisher } from '../../domain/ports/IEventPublisher';
import { UserAuth } from '../../domain/entities/UserAuth.entity';
import { UserRegisteredEvent } from '../../domain/events/UserRegistered.event';
import { RegisterDTO, RegisterResultDTO } from '../dtos/auth.dtos';
import { PasswordComplexityValidator } from '../../domain/value-objects/PasswordComplexityValidator.vo';
import { EmailValidator } from '../../domain/value-objects/EmailValidator.vo';
import { SendEmailVerificationTokenUseCase } from './SendEmailVerificationToken.usecase';
import { DuplicateEmailError, ValidationError } from '../errors/errors';

export class RegisterUserUseCase {
  constructor(
    private userAuthRepo: IUserAuthRepository,
    private hasher: IPasswordHasher,
    private eventPublisher: IEventPublisher,
    private sendEmailVerificationTokenUseCase: SendEmailVerificationTokenUseCase
  ) {}

  async execute(dto: RegisterDTO): Promise<RegisterResultDTO> {
    if (!dto.email) {
      throw new ValidationError('Email is required');
    }

    const normalizedEmail = dto.email.trim().toLowerCase();

    const emailValidation = EmailValidator.validate(normalizedEmail);
    if (!emailValidation.isValid) {
      throw new ValidationError(emailValidation.error || 'Invalid email format');
    }

    if (!dto.password || !dto.passwordConfirm) {
      throw new ValidationError('Password and password confirmation are required');
    }

    if (dto.password !== dto.passwordConfirm) {
      throw new ValidationError('Password and confirm password do not match');
    }

    const complexityResult = PasswordComplexityValidator.validate(dto.password);
    if (!complexityResult.isValid) {
      throw new ValidationError(complexityResult.error || 'Password does not meet complexity requirements');
    }

    // Role assignment check: Block privileged roles (ADMIN, SUPER_ADMIN, EMPLOYEE)
    const allowedSelfRegRoles = ['CLIENT', 'DEVELOPER', 'USER'];
    let assignedRole = 'CLIENT';

    if (dto.role) {
      const upperRole = dto.role.toUpperCase();
      const forbiddenRoles = ['ADMIN', 'SUPER_ADMIN', 'EMPLOYEE'];
      if (forbiddenRoles.includes(upperRole)) {
        throw new ValidationError('Self-assignment of privileged roles is not allowed');
      }
      if (allowedSelfRegRoles.includes(upperRole)) {
        assignedRole = upperRole;
      }
    }

    const existing = await this.userAuthRepo.findByEmail(normalizedEmail);
    if (existing) {
      throw new DuplicateEmailError('Email already registered');
    }

    const hashedPassword = await this.hasher.hash(dto.password);
    const newUser = UserAuth.create({
      email: normalizedEmail,
      passwordHash: hashedPassword,
      name: dto.name,
      role: assignedRole,
      provider: 'local'
    });

    // Save unverified user aggregate
    const savedUser = await this.userAuthRepo.save(newUser);
    const userId = savedUser.id!;

    // Initiate email verification workflow — email failures are NOT swallowed
    await this.sendEmailVerificationTokenUseCase.execute({ email: savedUser.email });

    // Publish Event-Driven Message (Pub/Sub)
    const registeredEvent = new UserRegisteredEvent({
      userId,
      email: savedUser.email,
      name: savedUser.name,
      provider: 'local',
      registeredAt: new Date(),
      version: 1
    });

    await this.eventPublisher.publish(registeredEvent.eventName, registeredEvent.payload);

    return {
      isVerificationRequired: true,
      user: {
        id: userId,
        email: savedUser.email,
        name: savedUser.name,
        role: savedUser.role,
        isEmailVerified: savedUser.isEmailVerified
      }
    };
  }
}
