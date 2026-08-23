import { Schema, model, Document } from 'mongoose';

export interface IUserAuthDocument extends Document {
  email: string;
  passwordHash?: string;
  name?: string;
  provider: 'local' | 'google' | 'github';
  providerId?: string;
  role: string;
  isActive: boolean;
  passwordChangedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserAuthSchema = new Schema<IUserAuthDocument>(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String },
    name: { type: String },
    provider: { type: String, enum: ['local', 'google', 'github'], default: 'local' },
    providerId: { type: String, index: true },
    role: { type: String, required: true, default: 'USER' },
    isActive: { type: Boolean, default: true },
    passwordChangedAt: { type: Date }
  },
  { timestamps: true }
);

export const UserAuthModel = model<IUserAuthDocument>('UserAuth', UserAuthSchema);
