import { DataSource } from "typeorm";
import { User } from "../entities/User";
import { GameRecord } from "../entities/GameRecord";
import { GameSession } from "../entities/GameSession";

const isProduction = process.env.NODE_ENV === "production";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: true,
  logging: !isProduction,
  entities: [User, GameRecord, GameSession],
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});
