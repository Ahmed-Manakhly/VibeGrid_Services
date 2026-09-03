export class MediaApplicationError extends Error {
  constructor(message: string, public readonly statusCode: number = 400) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends MediaApplicationError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class UnauthorizedError extends MediaApplicationError {
  constructor(message: string = 'Authentication required') {
    super(message, 401);
  }
}

export class ForbiddenError extends MediaApplicationError {
  constructor(message: string = 'Forbidden: Access denied') {
    super(message, 403);
  }
}

export class NotFoundError extends MediaApplicationError {
  constructor(message: string = 'Media asset not found') {
    super(message, 404);
  }
}

export class ConflictError extends MediaApplicationError {
  constructor(message: string) {
    super(message, 409);
  }
}
