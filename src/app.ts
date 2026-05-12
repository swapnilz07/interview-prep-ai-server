import express, { Application, NextFunction, Request, Response } from "express";
import { createServer, Server as HttpServer } from "node:http";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
import { rateLimit } from "express-rate-limit";
import authRoutes from "./features/auth/auth.route";
import interviewRoutes from "./features/interview/interview.routes"

export interface AppInstance {
  app: Application;
  server: HttpServer;
}

export const createApp = (): AppInstance => {
  const app: Application = express();
  const server: HttpServer = createServer(app);

  // Middlewares
  app.use(express.json({ limit: "10mb" })); // Parse JSON bodies
  app.use(express.urlencoded({ extended: true, limit: "10mb" })); // Parse URL-encoded bodies
  app.use(cookieParser());
  app.use(
    cors({
      origin: process.env.FRONTEND_URL,
      credentials: true,
    }),
  );
  app.use(morgan("dev"));

  app.get("/", (req: Request, res: Response) => {
    res
      .status(200)
      .json({ message: "Welcome to AI Interview Preparation API" });
  });

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per `window`
    message: { error: "Too many requests, please try again later." },
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  });

  // all routes here
  app.use("/api", apiLimiter);
  app.use("/api/auth", authRoutes);
  app.use("/api/interview", interviewRoutes);

  // Global error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res
      .status(500)
      .json({ error: "Internal Server Error", message: err.message });
  });

  // 404 handler for unmatched routes
  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: "Route not found" });
  });

  return { app, server };
};
