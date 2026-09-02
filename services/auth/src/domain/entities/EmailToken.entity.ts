export interface EmailTokenProps {
  id?: string;
  email: string;
  tokenHash: string; // SHA-256 Hashed OTP
  expiresAt: Date;
  createdAt?: Date;
}

export class EmailToken {
  private props: EmailTokenProps;

  private constructor(props: EmailTokenProps) {
    this.props = {
      ...props,
      createdAt: props.createdAt || new Date()
    };
  }

  public static create(props: EmailTokenProps): EmailToken {
    return new EmailToken(props);
  }

  public get id(): string | undefined {
    return this.props.id;
  }

  public get email(): string {
    return this.props.email;
  }

  public get tokenHash(): string {
    return this.props.tokenHash;
  }

  // Alias for backward compatibility
  public get emailToken(): string {
    return this.props.tokenHash;
  }

  public get expiresAt(): Date {
    return this.props.expiresAt;
  }

  public get createdAt(): Date {
    return this.props.createdAt || new Date();
  }

  public isExpired(): boolean {
    return new Date() > this.props.expiresAt;
  }
}
