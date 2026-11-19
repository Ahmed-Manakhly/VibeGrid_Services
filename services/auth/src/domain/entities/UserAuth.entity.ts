export interface UserAuthProps {
  id?: string;
  email: string;
  passwordHash?: string;
  name?: string;
  provider?: 'local' | 'google' | 'github';
  providerId?: string;
  role?: string;
  isActive?: boolean;
  isEmailVerified?: boolean;
  emailVerifiedAt?: Date | null;
  isPolicyAccepted?: boolean;
  policyAcceptedAt?: Date | null;
  passwordChangedAt?: Date;
  failedAttempts?: number;
  lockoutUntil?: Date | null;
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class UserAuth {
  private props: UserAuthProps;

  private constructor(props: UserAuthProps) {
    const isOAuth = props.provider && props.provider !== 'local';
    const isVerified = props.isEmailVerified !== undefined ? props.isEmailVerified : (isOAuth ? true : false);
    const isPolicyAccepted = Boolean(props.isPolicyAccepted);
    this.props = {
      ...props,
      provider: props.provider || 'local',
      role: props.role || 'USER',
      isActive: props.isActive !== undefined ? props.isActive : true,
      isEmailVerified: isVerified,
      emailVerifiedAt: props.emailVerifiedAt !== undefined ? props.emailVerifiedAt : (isVerified ? new Date() : null),
      isPolicyAccepted,
      policyAcceptedAt: props.policyAcceptedAt !== undefined ? props.policyAcceptedAt : (isPolicyAccepted ? new Date() : null),
      failedAttempts: props.failedAttempts ?? 0,
      lockoutUntil: props.lockoutUntil ?? undefined,
      deletedAt: props.deletedAt ?? undefined,
      passwordChangedAt: props.passwordChangedAt,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date()
    };
  }

  public static create(props: UserAuthProps): UserAuth {
    return new UserAuth(props);
  }

  public get id(): string | undefined {
    return this.props.id;
  }

  public get email(): string {
    return this.props.email;
  }

  public get passwordHash(): string | undefined {
    return this.props.passwordHash;
  }

  public get name(): string | undefined {
    return this.props.name;
  }

  public get provider(): string {
    return this.props.provider || 'local';
  }

  public get providerId(): string | undefined {
    return this.props.providerId;
  }

  public get role(): string {
    return this.props.role || 'USER';
  }

  public get isActive(): boolean {
    return this.props.isActive !== undefined ? this.props.isActive : true;
  }

  public get isEmailVerified(): boolean {
    return !!this.props.isEmailVerified;
  }

  public get emailVerifiedAt(): Date | undefined | null {
    return this.props.emailVerifiedAt;
  }

  public get isPolicyAccepted(): boolean {
    return Boolean(this.props.isPolicyAccepted);
  }

  public get policyAcceptedAt(): Date | undefined | null {
    return this.props.policyAcceptedAt;
  }

  public acceptPolicy(now: Date = new Date()): void {
    this.props.isPolicyAccepted = true;
    this.props.policyAcceptedAt = now;
    this.props.updatedAt = now;
  }

  public verifyEmail(now: Date = new Date()): void {
    this.props.isEmailVerified = true;
    this.props.emailVerifiedAt = now;
    this.props.updatedAt = now;
  }

  public get failedAttempts(): number {
    return this.props.failedAttempts || 0;
  }

  public get lockoutUntil(): Date | undefined {
    return this.props.lockoutUntil || undefined;
  }

  public get deletedAt(): Date | undefined {
    return this.props.deletedAt || undefined;
  }

  public get isDeleted(): boolean {
    return !!this.props.deletedAt;
  }

  public get passwordChangedAt(): Date | undefined {
    return this.props.passwordChangedAt;
  }

  public get createdAt(): Date {
    return this.props.createdAt || new Date();
  }

  public get updatedAt(): Date {
    return this.props.updatedAt || new Date();
  }

  public softDelete(now: Date = new Date()): void {
    this.props.deletedAt = now;
    this.props.isActive = false;
    this.props.updatedAt = now;
  }

  public isLockedOut(now: Date = new Date()): boolean {
    if (this.props.lockoutUntil && now < this.props.lockoutUntil) {
      return true;
    }
    return false;
  }

  public recordFailedAttempt(now: Date = new Date()): void {
    const currentAttempts = (this.props.failedAttempts || 0) + 1;
    this.props.failedAttempts = currentAttempts;

    if (currentAttempts >= 10) {
      this.props.lockoutUntil = new Date(now.getTime() + 15 * 60 * 1000);
    }
    this.props.updatedAt = new Date();
  }

  public resetLockout(): void {
    this.props.failedAttempts = 0;
    this.props.lockoutUntil = undefined;
    this.props.updatedAt = new Date();
  }

  public updatePassword(newPasswordHash: string, changedAt: Date = new Date()): void {
    this.props.passwordHash = newPasswordHash;
    this.props.passwordChangedAt = changedAt;
    this.props.updatedAt = new Date();
  }
}
