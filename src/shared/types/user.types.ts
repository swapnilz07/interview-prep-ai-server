import { Document } from "mongoose";

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  refreshToken?: string;
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface IBlacklist extends Document {
  token: string; // The refresh token (or its hash) to blacklist
  expiresAt: Date; // When this blacklist entry expires (same as token expiry)
  userId?: string; // Optional: track which user's token was blacklisted
}
