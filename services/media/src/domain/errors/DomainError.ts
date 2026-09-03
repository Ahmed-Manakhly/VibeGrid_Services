export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InvalidMediaTransitionError extends DomainError {
  constructor(fromStatus: string, toStatus: string) {
    super(`Cannot transition MediaAsset status from '${fromStatus}' to '${toStatus}'`);
  }
}

export class InvalidMediaFileError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}
