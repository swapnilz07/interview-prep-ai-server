import bcrypt from "bcrypt";
import { LoginInput, RegisterInput } from "../../shared/types/user.types";
import userModel from "./user.model";
import {
  decodeToken,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "./auth.utils";
import { Blacklist } from "./blacklist.model";
import jwt from "jsonwebtoken";

/**
 * Registers a new user in the system.
 * @param input - User registration data (username, email, password)
 * @returns Object containing the created user (without sensitive fields) and tokens
 * @throws Error if email or username already exists
 */
export const registerUser = async (input: RegisterInput) => {
  const existingUser = await userModel.findOne({
    $or: [{ email: input.email }, { username: input.username }],
  });

  if (existingUser) {
    if (existingUser.email === input.email)
      throw new Error("Email already registered");
    if (existingUser.username === input.username)
      throw new Error("Username already taken");
  }

  const user = await userModel.create({
    username: input.username,
    email: input.email,
    password: input.password,
  });

  // generate access token
  const accessToken = generateAccessToken(user._id.toString());
  const refreshToken = generateRefreshToken(user._id.toString());

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { user, accessToken, refreshToken };
};

/**
 * Authenticates a user with email and password.
 *
 * @param input - Login credentials (email, password)
 * @returns Object containing user data and tokens
 * @throws Error if user not found or password is invalid
 */
export const loginUser = async (input: LoginInput) => {
  const user = await userModel
    .findOne({ email: input.email })
    .select("+password +refreshToken");

  if (!user) throw new Error("Invalid Email or Password");

  const isPasswordValid = await bcrypt.compare(input.password, user.password);
  if (!isPasswordValid) throw new Error("Invalid Email or Password");

  const accessToken = generateAccessToken(user._id.toString());
  const refreshToken = generateRefreshToken(user._id.toString());

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { user, accessToken, refreshToken };
};

/**
 * Logout user by blacklisting the refresh token and clearing cookie.
 * @param refreshToken - The refresh token from the cookie
 * @throws Error if token is missing, invalid, or already blacklisted
 */
export const logoutUser = async (refreshToken: string, accessToken?: string): Promise<void> => {
  if (!refreshToken) {
    throw new Error("Refresh token missing");
  }

  // Verify the refresh token (decode & check expiry)
  let decoded: { userId: string };
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (err) {
    throw new Error("Invalid or expired refresh token");
  }

  // Check if already blacklisted
  const existing = await Blacklist.findOne({ token: refreshToken });
  if (existing) {
    throw new Error("Already logged out");
  }

  const decodedFull: any = jwt.decode(refreshToken);
  if (!decodedFull || !decodedFull.exp) {
    throw new Error("Invalid token structure");
  }

  const expiresAt = new Date(decodedFull.exp * 1000);

  await Blacklist.create({
    token: refreshToken,
    expiresAt,
    userId: decoded.userId,
  });


  if (accessToken) {
    try {
      const decodedAccess: any = jwt.decode(accessToken);
      if (decodedAccess && decodedAccess.exp) {
        // Only blacklist if it hasn't already expired
        const accessExpiresAt = new Date(decodedAccess.exp * 1000);
        if (accessExpiresAt > new Date()) {
          await Blacklist.create({
            token: accessToken,
            expiresAt: accessExpiresAt,
            userId: decoded.userId,
          });
        }
      }
    } catch (err) {
      // If access token is malformed, just log – don't break logout
      console.warn("Could not decode access token for blacklisting", err);
    }
  }
};

export const refreshAccessToken = async (oldRefreshToken: string) => {
  if (!oldRefreshToken) {
    throw new Error("Refresh token missing");
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(oldRefreshToken);
  } catch (err) {
    throw new Error("Invalid or expired refresh token");
  }

  // 2. Check if the old refresh token is blacklisted
  const isBlacklisted = await Blacklist.findOne({ token: oldRefreshToken });
  if (isBlacklisted) {
    throw new Error("Refresh token revoked");
  }

  // 3. Find the user
  const user = await userModel
    .findById(decoded?.userId)
    .select("+refreshToken");
  if (!user) {
    throw new Error("User not found");
  }

  if (user.refreshToken !== oldRefreshToken) {
    throw new Error("Refresh token mismatch");
  }

  const newAccessToken = generateAccessToken(user._id.toString());
  const newRefreshToken = generateRefreshToken(user._id.toString());

  // 6. Blacklist the old refresh token (optional but recommended for rotation)
  const decodedOld = decodeToken(oldRefreshToken);
  const expiresAt = decodedOld.exp
    ? new Date(decodedOld.exp * 1000)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await Blacklist.create({
    token: oldRefreshToken,
    expiresAt,
    userId: user._id.toString(),
  });

  // 7. Update user's refresh token in DB
  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};
