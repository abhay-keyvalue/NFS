import { DataSource } from "typeorm";
import { User } from "../entities/User";
import { GameRecord } from "../entities/GameRecord";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: true,
  logging: process.env.NODE_ENV !== "production",
  entities: [User, GameRecord],
});
