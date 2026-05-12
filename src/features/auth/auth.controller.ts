import { Request, Response } from "express";
import {
  loginUser,
  registerUser,
  logoutUser,
  refreshAccessToken,
} from "./auth.service";
import { env } from "../../shared/config/env";

/**
 * Handles user registration request.
 * @route POST /api/auth/register
 * @access Public
 * @param req - Express request object containing username, email, password in body
 * @param res - Express response object
 * @returns JSON response with user data and access token (refresh token set as HTTP-only cookie)
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Username, email and password are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    // call auth register service to reguster user
    const { user, accessToken, refreshToken } = await registerUser({
      username,
      email,
      password,
    });

    //set referesh token as http-only cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      // sameSite: "strict",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfull",
      data: {
        user,
        accessToken,
      },
    });
  } catch (error: any) {
    console.error("Register error:", error);

    if (
      error.message === "Email already registered" ||
      error.message === "Username already taken"
    ) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

/**
 * Handles user login request.
 *
 * @route POST /api/auth/login
 * @access Public
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and Password are required." });
    }

    const { user, accessToken, refreshToken } = await loginUser({
      email,
      password,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      // sameSite: "strict",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Logged in successfully",
      data: { user, accessToken },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    if (error.message === "Invalid Email or Password") {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * Handles user logout.
 * @route POST /api/auth/logout
 * @access Public (but requires refresh token cookie)
 */
export const logout = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "No refresh token provided",
      });
    }

    // 🆕 Extract access token from Authorization header
    let accessToken: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      accessToken = authHeader.split(" ")[1];
    }

    await logoutUser(refreshToken, accessToken);

    // Clear the refresh token cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error: any) {
    console.error("Logout error:", error);
    if (
      error.message === "Invalid or expired refresh token" ||
      error.message === "Refresh token missing" ||
      error.message === "Already logged out"
    ) {
      // Still clear cookie if token is invalid but client thinks it's logged in
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "strict",
      });
      return res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get current authenticated user's profile.
 * @route GET /api/auth/me
 * @access Private (requires valid access token)
 */
export const getMe = async (req: Request, res: Response) => {
  try {
    // User is attached by the authenticate middleware
    const user = req.user;
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }
    return res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error: any) {
    console.error("GetMe error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

/**
 * Refresh access token using the refresh token cookie.
 * @route POST /api/auth/refresh
 * @access Public (requires refresh token cookie)
 */
export const refresh = async (req: Request, res: Response) => {
  try {
    const oldRefreshToken = req.cookies?.refreshToken;
    if (!oldRefreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token missing",
      });
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await refreshAccessToken(oldRefreshToken);

    // Set the new refresh token as an HTTP-only cookie (replace the old one)
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // 'none' for cross-origin
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: { accessToken },
    });
  } catch (error: any) {
    console.error("Refresh error:", error);
    if (
      error.message === "Refresh token missing" ||
      error.message === "Invalid or expired refresh token" ||
      error.message === "Refresh token revoked" ||
      error.message === "Refresh token mismatch"
    ) {
      // Clear the invalid cookie
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "strict",
      });
      return res.status(401).json({
        success: false,
        message: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
