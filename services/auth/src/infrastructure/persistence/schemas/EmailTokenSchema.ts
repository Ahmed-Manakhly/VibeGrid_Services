import mongoose, { Schema, Document } from 'mongoose';

export interface IEmailTokenDocument extends Document {
  email: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

const EmailTokenSchema = new Schema<IEmailTokenDocument>(
  {
    email: { type: String, required: true, unique: true, index: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } } // Automatic TTL expiration
  },
  {
    timestamps: true
  }
);

export const EmailTokenModel = mongoose.model<IEmailTokenDocument>('EmailToken', EmailTokenSchema);
