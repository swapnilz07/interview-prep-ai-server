import { Router } from "express";
import { login, register, logout, getMe, refresh } from "./auth.controller";
import { authenticate } from "./auth.middleware";

const router: Router = Router();

/**
 * @route POST /api/auth/register
 * @description Register a new user
 * @access Public
 */
router.post("/register", register);

/**
 * @route POST /api/auth/login
 * @description Authenticate user with email and password
 * @access Public
 */
router.post("/login", login);

/**
 * @route POST /api/auth/logout
 * @description Logout user (blacklists refresh token and clears cookie)
 * @access Public (requires refresh token cookie)
 */
router.post("/logout", logout);

router.post("/refresh", refresh);
/**
 * @route GET /api/auth/me
 * @description Get current authenticated user's profile
 * @access Private (Bearer token required)
 */
router.get("/get-me", authenticate, getMe);

export default router;
