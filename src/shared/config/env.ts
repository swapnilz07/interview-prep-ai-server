import dotenv from "dotenv";

dotenv.config();

// Helper to ensure required variables exist
const getEnvVar = (key: string, required = true): string => {
  const value = process.env[key];
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || "";
};

export const env = {
  // server & DB
  NODE_ENV: process.env.NODE_ENV || "",
  PORT: Number.parseInt(process.env.PORT || "8000", 10),
  MONGO_URI: getEnvVar("MONGO_URI"),

  // Authentication
  JWT_SECRET: getEnvVar("JWT_SECRET"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  REFRESH_TOKEN_SECRET: getEnvVar("REFRESH_TOKEN_SECRET"),
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || "30d",

  // AI / API keys
  //   OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
} as const; // 'as const' makes all properties readonly

export type Env = typeof env;
