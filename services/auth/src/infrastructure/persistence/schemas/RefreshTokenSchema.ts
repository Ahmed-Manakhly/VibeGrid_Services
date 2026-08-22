import { Schema, model } from 'mongoose';

export interface IRefreshTokenDocument {
  userId: string;
  tokenHash: string;
  familyId: string;
  isRevoked: boolean;
  expiresAt: Date;
  createdAt: Date;
}

const RefreshTokenSchema = new Schema<IRefreshTokenDocument>(
  {
    userId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    familyId: { type: String, required: true, index: true },
    isRevoked: { type: Boolean, required: true, default: false },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }
  },
  { timestamps: true }
);

export const RefreshTokenModel = model<IRefreshTokenDocument>('RefreshToken', RefreshTokenSchema);
