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

const PORT = parseInt(process.env.PORT || "3001", 10);

async function bootstrap() {
  await AppDataSource.initialize();
  console.log("Database connected");

  const app = express();

  app.use(helmet());
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
    : ["*"];
  app.use(cors({ origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins }));
  app.use(express.json());

  app.use("/api/auth", authRoutes);
  app.use("/api/games", gameRoutes);
  app.use("/api/users", userRoutes);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
