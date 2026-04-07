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
  // Subquery to get the best (minimum) elapsed time for each user
  const subQuery = gameRepo()
    .createQueryBuilder("sub")
    .select("sub.userId", "userId")
    .addSelect("MIN(sub.elapsedMs)", "bestTime")
    .where("sub.gameMode = :mode", { mode })
    .groupBy("sub.userId");

  if (difficulty) {
    subQuery.andWhere("sub.difficulty = :difficulty", { difficulty });
  }

  // For AI/multiplayer, only show wins
  if (mode !== GameMode.SOLO) {
    subQuery.andWhere("sub.won = true");
  }

  // Main query to get full records matching the best times
  const qb = gameRepo()
    .createQueryBuilder("g")
    .innerJoinAndSelect("g.user", "u")
    .innerJoin(
      `(${subQuery.getQuery()})`,
      "best",
      "g.userId = best.userId AND g.elapsedMs = best.bestTime"
    )
    .where("g.gameMode = :mode", { mode })
    .setParameters(subQuery.getParameters())
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
  
  // Remove duplicates in case a user has multiple records with the same best time
  const uniqueRecords = records.reduce((acc, record) => {
    if (!acc.find(r => r.userId === record.userId)) {
      acc.push(record);
    }
    return acc;
  }, [] as GameRecord[]);

  return uniqueRecords.map((r) => ({
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
