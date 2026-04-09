import { DataSource } from "typeorm";
import { User } from "../entities/User";
import { GameRecord } from "../entities/GameRecord";
import { GameSession } from "../entities/GameSession";
import { GameCheckpoint } from "../entities/GameCheckpoint";

const isProduction = process.env.NODE_ENV === "production";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

console.log("Database URL host:", new URL(process.env.DATABASE_URL).hostname);

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: true,
  logging: !isProduction,
  entities: [User, GameRecord, GameSession, GameCheckpoint],
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  connectTimeoutMS: 30000,
  extra: {
    connectionTimeoutMillis: 30000,
    query_timeout: 30000,
  },
});
