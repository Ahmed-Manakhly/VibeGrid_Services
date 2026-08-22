export interface RefreshTokenProps {
  id?: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  isRevoked: boolean;
  expiresAt: Date;
  createdAt?: Date;
}

export class RefreshToken {
  private props: RefreshTokenProps;

  private constructor(props: RefreshTokenProps) {
    this.props = {
      ...props,
      isRevoked: props.isRevoked ?? false,
      createdAt: props.createdAt || new Date()
    };
  }

  public static create(props: RefreshTokenProps): RefreshToken {
    return new RefreshToken(props);
  }

  public get id(): string | undefined {
    return this.props.id;
  }

  public get userId(): string {
    return this.props.userId;
  }

  public get tokenHash(): string {
    return this.props.tokenHash;
  }

  public get familyId(): string {
    return this.props.familyId;
  }

  public get isRevoked(): boolean {
    return this.props.isRevoked;
  }

  public get expiresAt(): Date {
    return this.props.expiresAt;
  }

  public get createdAt(): Date {
    return this.props.createdAt || new Date();
  }

  public revoke(): void {
    this.props.isRevoked = true;
  }
}
