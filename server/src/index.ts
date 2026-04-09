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
  console.log("Attempting to connect to database...");
  
  let retries = 5;
  while (retries > 0) {
    try {
      await AppDataSource.initialize();
      console.log("Database connected successfully");
      break;
    } catch (error) {
      retries--;
      console.error(`Database connection failed. Retries left: ${retries}`, error);
      
      if (retries === 0) {
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  const app = express();

  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
    : ["*"];
  
  console.log("CORS allowed origins:", allowedOrigins);
  
  app.use(cors({
    origin: (origin, callback) => {
      if (allowedOrigins.includes("*")) {
        callback(null, true);
        return;
      }
      
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
    maxAge: 600,
  }));
  
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: false,
    crossOriginEmbedderPolicy: false,
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
