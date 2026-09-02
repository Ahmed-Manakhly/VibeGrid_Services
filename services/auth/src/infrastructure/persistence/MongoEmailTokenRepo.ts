import { IEmailTokenRepository } from '../../domain/ports/IEmailTokenRepository';
import { EmailToken } from '../../domain/entities/EmailToken.entity';
import { EmailTokenModel, IEmailTokenDocument } from './schemas/EmailTokenSchema';

export class MongoEmailTokenRepo implements IEmailTokenRepository {
  private toDomain(doc: IEmailTokenDocument): EmailToken {
    return EmailToken.create({
      id: doc._id.toString(),
      email: doc.email,
      tokenHash: doc.tokenHash,
      expiresAt: doc.expiresAt,
      createdAt: doc.createdAt
    });
  }

  public async upsert(emailToken: EmailToken): Promise<EmailToken> {
    const doc = await EmailTokenModel.findOneAndUpdate(
      { email: emailToken.email },
      {
        email: emailToken.email,
        tokenHash: emailToken.tokenHash,
        expiresAt: emailToken.expiresAt
      },
      { upsert: true, new: true }
    ).exec();

    return this.toDomain(doc!);
  }

  public async findByEmail(email: string): Promise<EmailToken | null> {
    const doc = await EmailTokenModel.findOne({ email }).exec();
    return doc ? this.toDomain(doc) : null;
  }

  public async deleteByEmail(email: string): Promise<void> {
    await EmailTokenModel.deleteOne({ email }).exec();
  }
}
