import { EmailMessage } from '../value-objects/EmailMessage.vo';

export interface IEmailProvider {
  send(message: EmailMessage): Promise<void>;
}
