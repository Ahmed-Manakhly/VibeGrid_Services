export interface UserAuthProps {
  id?: string;
  email: string;
  passwordHash?: string;
  name?: string;
  provider?: 'local' | 'google' | 'github';
  providerId?: string;
  role?: string;
  isActive?: boolean;
  passwordChangedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class UserAuth {
  private props: UserAuthProps;

  private constructor(props: UserAuthProps) {
    this.props = {
      ...props,
      provider: props.provider || 'local',
      role: props.role || 'USER',
      isActive: props.isActive !== undefined ? props.isActive : true,
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

  public get passwordChangedAt(): Date | undefined {
    return this.props.passwordChangedAt;
  }

  public get createdAt(): Date {
    return this.props.createdAt || new Date();
  }

  public get updatedAt(): Date {
    return this.props.updatedAt || new Date();
  }

  public updatePassword(newPasswordHash: string, changedAt: Date = new Date()): UserAuth {
    return new UserAuth({
      ...this.props,
      passwordHash: newPasswordHash,
      passwordChangedAt: changedAt,
      updatedAt: new Date()
    });
  }
}
