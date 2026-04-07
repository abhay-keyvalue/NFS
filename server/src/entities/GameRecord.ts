import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";

export enum GameMode {
  SOLO = "solo",
  AI = "ai",
  MULTIPLAYER = "multiplayer",
}

export enum DifficultyLevel {
  EASY = "easy",
  MEDIUM = "medium",
  HARD = "hard",
}

@Entity("game_records")
export class GameRecord {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  userId!: string;

  @ManyToOne(() => User, (user) => user.gameRecords, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column({ type: "enum", enum: GameMode })
  gameMode!: GameMode;

  @Column({ type: "enum", enum: DifficultyLevel, nullable: true })
  difficulty!: DifficultyLevel | null;

  @Column({ type: "int" })
  totalLaps!: number;

  @Column({ type: "int" })
  elapsedMs!: number;

  @Column({ type: "int", default: 0 })
  collisions!: number;

  @Column({ type: "boolean", nullable: true })
  won!: boolean | null;

  @CreateDateColumn()
  createdAt!: Date;
}
