export interface RevokedTokenProps {
  id?: string;
  token: string;
  type: 'ACCESS' | 'REFRESH';
  revokedAt?: Date;
  expiresAt: Date;
}

export class RevokedToken {
  private props: RevokedTokenProps;

  private constructor(props: RevokedTokenProps) {
    this.props = {
      ...props,
      revokedAt: props.revokedAt || new Date()
    };
  }

  public static create(props: RevokedTokenProps): RevokedToken {
    return new RevokedToken(props);
  }

  public get id(): string | undefined {
    return this.props.id;
  }

  public get token(): string {
    return this.props.token;
  }

  public get type(): 'ACCESS' | 'REFRESH' {
    return this.props.type;
  }

  public get revokedAt(): Date {
    return this.props.revokedAt || new Date();
  }

  public get expiresAt(): Date {
    return this.props.expiresAt;
  }
}
