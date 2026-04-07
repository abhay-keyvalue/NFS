import { AppDataSource } from "../config/database";
import { GameRecord, GameMode } from "../entities/GameRecord";
import { User } from "../entities/User";

const gameRepo = () => AppDataSource.getRepository(GameRecord);
const userRepo = () => AppDataSource.getRepository(User);

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  totalRaces: number;
  bestTimes: Record<string, number | null>;
  avgCollisions: number;
  winRate: number | null;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const user = await userRepo().findOneBy({ id: userId });
  if (!user) return null;

  const records = await gameRepo().find({ where: { userId } });

  const totalRaces = records.length;

  const bestTimes: Record<string, number | null> = {};
  for (const mode of Object.values(GameMode)) {
    const modeRecords = records.filter((r) => r.gameMode === mode);
    if (modeRecords.length === 0) {
      bestTimes[mode] = null;
    } else {
      bestTimes[mode] = Math.min(...modeRecords.map((r) => r.elapsedMs));
    }
  }

  const totalCollisions = records.reduce((sum, r) => sum + r.collisions, 0);
  const avgCollisions = totalRaces > 0 ? Math.round(totalCollisions / totalRaces) : 0;

  const competitiveRecords = records.filter((r) => r.won !== null);
  const wins = competitiveRecords.filter((r) => r.won === true).length;
  const winRate =
    competitiveRecords.length > 0
      ? Math.round((wins / competitiveRecords.length) * 100)
      : null;

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    totalRaces,
    bestTimes,
    avgCollisions,
    winRate,
  };
}
