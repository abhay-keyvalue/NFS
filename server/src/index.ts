import "reflect-metadata";
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { AppDataSource } from "./config/database";
import authRoutes from "./routes/auth";
import gameRoutes from "./routes/games";
import userRoutes from "./routes/users";
import adminRoutes from "./routes/admin";

const PORT = parseInt(process.env.PORT || "3001", 10);

async function bootstrap() {
  await AppDataSource.initialize();
  console.log("Database connected");

  const app = express();

  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
    : ["*"];
  app.use(cors({
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }));
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: false,
  }));
  app.use(express.json());

  app.use("/api/auth", authRoutes);
  app.use("/api/games", gameRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/admin", adminRoutes);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
