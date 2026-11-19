import { Schema, model, Document } from 'mongoose';

export interface IUserAuthDocument extends Document {
  email: string;
  passwordHash?: string;
  name?: string;
  provider: 'local' | 'google' | 'github';
  providerId?: string;
  role: string;
  isActive: boolean;
  isEmailVerified: boolean;
  emailVerifiedAt?: Date;
  isPolicyAccepted: boolean;
  policyAcceptedAt?: Date;
  passwordChangedAt?: Date;
  failedAttempts: number;
  lockoutUntil?: Date;
  deletedAt?: Date;
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
    isEmailVerified: { type: Boolean, default: false },
    emailVerifiedAt: { type: Date },
    isPolicyAccepted: { type: Boolean, default: false },
    policyAcceptedAt: { type: Date },
    passwordChangedAt: { type: Date },
    failedAttempts: { type: Number, default: 0 },
    lockoutUntil: { type: Date },
    deletedAt: { type: Date }
  },
  { timestamps: true }
);

export const UserAuthModel = model<IUserAuthDocument>('UserAuth', UserAuthSchema);
