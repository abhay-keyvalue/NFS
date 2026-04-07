import { AppDataSource } from "../config/database";
import { GameRecord, GameMode, DifficultyLevel } from "../entities/GameRecord";

const gameRepo = () => AppDataSource.getRepository(GameRecord);

export interface SaveGameInput {
  userId: string;
  gameMode: GameMode;
  difficulty: DifficultyLevel | null;
  totalLaps: number;
  elapsedMs: number;
  collisions: number;
  won: boolean | null;
}

export async function saveGameRecord(input: SaveGameInput): Promise<GameRecord> {
  const record = gameRepo().create(input);
  return gameRepo().save(record);
}

export async function getLeaderboard(
  mode: GameMode,
  difficulty?: DifficultyLevel,
  limit = 20
): Promise<(GameRecord & { displayName: string; avatarUrl: string | null })[]> {
  const qb = gameRepo()
    .createQueryBuilder("g")
    .innerJoinAndSelect("g.user", "u")
    .where("g.gameMode = :mode", { mode })
    .orderBy("g.elapsedMs", "ASC")
    .limit(limit);

  if (difficulty) {
    qb.andWhere("g.difficulty = :difficulty", { difficulty });
  }

  // For AI/multiplayer, only show wins
  if (mode !== GameMode.SOLO) {
    qb.andWhere("g.won = true");
  }

  const records = await qb.getMany();
  return records.map((r) => ({
    ...r,
    displayName: r.user?.displayName ?? "Unknown",
    avatarUrl: r.user?.avatarUrl ?? null,
  }));
}

export async function getUserHistory(
  userId: string,
  limit = 50
): Promise<GameRecord[]> {
  return gameRepo().find({
    where: { userId },
    order: { createdAt: "DESC" },
    take: limit,
  });
}
