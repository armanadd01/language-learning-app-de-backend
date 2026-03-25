import mongoose, { Schema } from 'mongoose';

export type UserRole = 'user' | 'admin';

export type UserDoc = {
  email: string;
  passwordHash: string;
  roles: UserRole[];
  profile?: {
    displayName?: string;
    nativeLanguage?: string;
    targetLanguage?: string;
    bio?: string;
    currentLevelCode?: string;
  };
  stats: {
    xpTotal: number;
    level: number;
    streakDays: number;
    lastActivityAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
};

const userSchema = new Schema<UserDoc>(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    roles: { type: [String], required: true, default: ['user'] },
    profile: {
      displayName: { type: String },
      nativeLanguage: { type: String },
      targetLanguage: { type: String, default: 'de' },
      bio: { type: String },
      currentLevelCode: { type: String },
    },
    stats: {
      xpTotal: { type: Number, required: true, default: 0 },
      level: { type: Number, required: true, default: 1 },
      streakDays: { type: Number, required: true, default: 0 },
      lastActivityAt: { type: Date },
    },
  },
  { timestamps: true }
);

export const UserModel = mongoose.model<UserDoc>('User', userSchema);
