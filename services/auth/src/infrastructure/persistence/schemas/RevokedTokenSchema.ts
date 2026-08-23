import mongoose, { Schema, Document } from 'mongoose';

export interface IRevokedTokenDocument extends Document {
  token: string;
  type: 'ACCESS' | 'REFRESH';
  revokedAt: Date;
  expiresAt: Date;
}

const RevokedTokenSchema = new Schema<IRevokedTokenDocument>(
  {
    token: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: ['ACCESS', 'REFRESH'], required: true },
    revokedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: { expires: 0 } } // TTL index automatically cleans up expired tokens
  },
  {
    timestamps: true
  }
);

export const RevokedTokenModel = mongoose.model<IRevokedTokenDocument>('RevokedToken', RevokedTokenSchema);
