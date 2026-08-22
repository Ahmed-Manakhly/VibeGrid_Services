export interface UserRegisteredPayload {
  userId: string;
  email: string;
  name?: string;
  provider: string;
  registeredAt: Date;
  version: number;
}

export class UserRegisteredEvent {
  public readonly eventName = 'user.registered';
  public readonly version = 1;

  constructor(public readonly payload: UserRegisteredPayload) {}
}
