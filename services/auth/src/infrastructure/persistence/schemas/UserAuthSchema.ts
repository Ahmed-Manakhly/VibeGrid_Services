import { Schema, model } from 'mongoose';

export interface IUserAuthDocument {
  _id: string;
  email: string;
  passwordHash?: string;
  name?: string;
  provider: 'local' | 'google' | 'github';
  providerId?: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserAuthSchema = new Schema<IUserAuthDocument>(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String },
    name: { type: String },
    provider: { type: String, required: true, default: 'local' },
    providerId: { type: String, index: true },
    role: { type: String, required: true, default: 'USER' }
  },
  { timestamps: true }
);

export const UserAuthModel = model<IUserAuthDocument>('UserAuth', UserAuthSchema);
