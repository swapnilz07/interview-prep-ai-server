import jwt from "jsonwebtoken";
import { env } from "../../shared/config/env";

export const generateAccessToken = (userId: string): string => {
  return jwt.sign({ userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
};

export const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ userId }, env.REFRESH_TOKEN_SECRET, {
    expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
};

export const verifyAccessToken = (token: string): { userId: string } => {
  return jwt.verify(token, env.JWT_SECRET) as { userId: string };
};

export const verifyRefreshToken = (
  token: string,
): { userId: string; exp: number } => {
  const decoded = jwt.verify(token, env.REFRESH_TOKEN_SECRET) as {
    userId: string;
    exp: number;
  };
  return decoded;
};

// Optional: decode without verification (for expiry extraction)
export const decodeToken = (token: string): any => {
  return jwt.decode(token);
};
