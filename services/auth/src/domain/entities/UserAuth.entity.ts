export interface UserAuthProps {
  id?: string;
  email: string;
  passwordHash?: string;
  name?: string;
  provider?: 'local' | 'google' | 'github';
  providerId?: string;
  role?: string;
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

  public get createdAt(): Date {
    return this.props.createdAt || new Date();
  }

  public get updatedAt(): Date {
    return this.props.updatedAt || new Date();
  }
}
