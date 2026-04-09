import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";
import { GameMode, DifficultyLevel } from "./GameRecord";

@Entity("game_sessions")
export class GameSession {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  userId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column({ type: "enum", enum: GameMode })
  gameMode!: GameMode;

  @Column({ type: "enum", enum: DifficultyLevel, nullable: true })
  difficulty!: DifficultyLevel | null;

  @Column({ type: "int" })
  totalLaps!: number;

  @Column({ type: "boolean", default: false })
  used!: boolean;

  @CreateDateColumn()
  startedAt!: Date;

  @Column({ type: "timestamp" })
  expiresAt!: Date;
}
