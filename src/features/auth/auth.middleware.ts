// src/features/auth/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "./auth.utils";
import { Blacklist } from "./blacklist.model";
import User from "./user.model";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access token missing or invalid format",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Access token missing" });
    }

    // Verify access token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      console.error("Access token verification failed:", err);
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired access token" });
    }

    // Check if token is blacklisted (optional – but good for security)
    const isBlacklisted = await Blacklist.findOne({ token });
    if (isBlacklisted) {
      return res
        .status(401)
        .json({ success: false, message: "Token has been revoked" });
    }

    // Fetch user from database (exclude sensitive fields)
    const user = await User.findById(decoded.userId).select(
      "-password -refreshToken",
    );
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
