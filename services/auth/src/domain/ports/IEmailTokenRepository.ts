import { EmailToken } from '../entities/EmailToken.entity';

export interface IEmailTokenRepository {
  upsert(emailToken: EmailToken): Promise<EmailToken>;
  findByEmail(email: string): Promise<EmailToken | null>;
  deleteByEmail(email: string): Promise<void>;
}
