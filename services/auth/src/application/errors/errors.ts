export class ApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidCredentialsError extends ApplicationError {}
export class UserNotFoundError extends ApplicationError {}
export class AccountLockedError extends ApplicationError {}
export class DuplicateEmailError extends ApplicationError {}
export class ValidationError extends ApplicationError {}
export class UnauthorizedError extends ApplicationError {}
export class ForbiddenError extends ApplicationError {}
export class NotFoundError extends ApplicationError {}
export class ConflictError extends ApplicationError {}
export class RateLimitError extends ApplicationError {}
