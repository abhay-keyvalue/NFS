import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { GameSession } from "./GameSession";

@Entity("game_checkpoints")
export class GameCheckpoint {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  sessionId!: string;

  @ManyToOne(() => GameSession, { onDelete: "CASCADE" })
  @JoinColumn({ name: "sessionId" })
  session!: GameSession;

  @Column({ type: "int" })
  sequenceNumber!: number;

  @Column({ type: "int" })
  timestamp!: number;

  @Column({ type: "float" })
  positionX!: number;

  @Column({ type: "float" })
  positionY!: number;

  @Column({ type: "float" })
  positionZ!: number;

  @Column({ type: "float" })
  velocity!: number;

  @Column({ type: "int" })
  currentLap!: number;

  @Column({ type: "int" })
  collisionCount!: number;

  @Column({ type: "float", nullable: true })
  rotationY!: number | null;

  @CreateDateColumn()
  receivedAt!: Date;
}
