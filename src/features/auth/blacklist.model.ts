// src/features/auth/blacklist.model.ts
import mongoose, { Schema } from "mongoose";
import { IBlacklist } from "../../shared/types/user.types";

const blacklistTokenSchema = new Schema<IBlacklist>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      expires: 0, // TTL index: automatically delete document after this date
    },
    userId: {
      type: String,
    },
  },
  { timestamps: true },
);

export const Blacklist = mongoose.model<IBlacklist>(
  "BlacklistToken",
  blacklistTokenSchema,
);
