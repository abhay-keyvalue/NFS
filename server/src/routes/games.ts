import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { gameSubmissionRateLimit } from "../middleware/rateLimit";
import { GameMode, DifficultyLevel } from "../entities/GameRecord";
import { GameSession } from "../entities/GameSession";
import { AppDataSource } from "../config/database";
import {
  saveGameRecord,
  getLeaderboard,
  getUserHistory,
} from "../services/game.service";

const router = Router();
const SESSION_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
const WALL_CLOCK_TOLERANCE_MS = 10_000; // 10 seconds for countdown + network latency

// Start a game session — called when the countdown begins
router.post("/start-session", requireAuth, async (req: Request, res: Response) => {
  try {
    const { gameMode, difficulty, totalLaps } = req.body;

    if (!gameMode || !totalLaps) {
      res.status(400).json({ error: "gameMode and totalLaps are required" });
      return;
    }

    if (!Object.values(GameMode).includes(gameMode)) {
      res.status(400).json({ error: "Invalid gameMode" });
      return;
    }

    if (difficulty && !Object.values(DifficultyLevel).includes(difficulty)) {
      res.status(400).json({ error: "Invalid difficulty" });
      return;
    }

    if (totalLaps < 1 || totalLaps > 10) {
      res.status(400).json({ error: "Invalid number of laps" });
      return;
    }

    const sessionRepo = AppDataSource.getRepository(GameSession);
    const now = new Date();

    const session = sessionRepo.create({
      userId: req.user!.userId,
      gameMode,
      difficulty: difficulty || null,
      totalLaps,
      used: false,
      expiresAt: new Date(now.getTime() + SESSION_EXPIRY_MS),
    });

    const saved = await sessionRepo.save(session);
    res.status(201).json({ sessionId: saved.id });
  } catch (err) {
    console.error("Start session error:", err);
    res.status(500).json({ error: "Failed to start game session" });
  }
});

router.post("/", requireAuth, gameSubmissionRateLimit, async (req: Request, res: Response) => {
  try {
    const { sessionId, gameMode, difficulty, totalLaps, elapsedMs, collisions, won } = req.body;

    // Session is required
    if (!sessionId) {
      res.status(400).json({ error: "sessionId is required. Start a game session first." });
      return;
    }

    if (!gameMode || !totalLaps || elapsedMs == null) {
      res.status(400).json({ error: "gameMode, totalLaps, and elapsedMs are required" });
      return;
    }

    if (!Object.values(GameMode).includes(gameMode)) {
      res.status(400).json({ error: "Invalid gameMode" });
      return;
    }

    if (difficulty && !Object.values(DifficultyLevel).includes(difficulty)) {
      res.status(400).json({ error: "Invalid difficulty" });
      return;
    }

    // --- Session validation ---
    const sessionRepo = AppDataSource.getRepository(GameSession);
    const session = await sessionRepo.findOne({ where: { id: sessionId } });

    if (!session) {
      res.status(400).json({ error: "Invalid session. Please play the game to submit a score." });
      return;
    }

    if (session.userId !== req.user!.userId) {
      res.status(403).json({ error: "Session does not belong to you." });
      return;
    }

    if (session.used) {
      res.status(400).json({ error: "Session already used. Each game can only be saved once." });
      return;
    }

    const now = new Date();
    if (now > session.expiresAt) {
      res.status(400).json({ error: "Session expired. Please start a new game." });
      return;
    }

    // Wall-clock validation: real time elapsed must be >= claimed time (minus tolerance)
    const serverElapsedMs = now.getTime() - session.startedAt.getTime();
    if (serverElapsedMs < elapsedMs - WALL_CLOCK_TOLERANCE_MS) {
      console.warn(
        `[Security] Wall-clock mismatch for user ${req.user!.userId}: ` +
        `claimed ${elapsedMs}ms but only ${serverElapsedMs}ms elapsed on server`
      );
      res.status(400).json({
        error: "Nice try! Your claimed time doesn't match how long you actually played.",
      });
      return;
    }

    // Mode & laps must match what was declared at session start
    if (session.gameMode !== gameMode || session.totalLaps !== totalLaps) {
      res.status(400).json({ error: "Game parameters don't match the session." });
      return;
    }

    // --- Standard field validation ---
    const minTimePerLap = 22065;
    const minTotalTime = minTimePerLap * totalLaps;
    if (elapsedMs < minTotalTime) {
      res.status(400).json({ error: "Invalid time: Good try... try again... but in a legit way." });
      return;
    }

    const maxTimePerLap = 600000;
    const maxTotalTime = maxTimePerLap * totalLaps;
    if (elapsedMs > maxTotalTime) {
      res.status(400).json({ error: "Invalid time: Time is too long." });
      return;
    }

    if (collisions < 0 || collisions > 1000) {
      res.status(400).json({ error: "Invalid collisions count." });
      return;
    }

    if (totalLaps < 1 || totalLaps > 10) {
      res.status(400).json({ error: "Invalid number of laps." });
      return;
    }

    // Mark session as used before saving the record
    session.used = true;
    await sessionRepo.save(session);

    const record = await saveGameRecord({
      userId: req.user!.userId,
      gameMode,
      difficulty: difficulty || null,
      totalLaps,
      elapsedMs,
      collisions: collisions ?? 0,
      won: won ?? null,
    });

    res.status(201).json({ record });
  } catch (err) {
    console.error("Save game error:", err);
    res.status(500).json({ error: "Failed to save game record" });
  }
});

router.get("/leaderboard", async (req: Request, res: Response) => {
  try {
    const mode = (req.query.mode as GameMode) || GameMode.SOLO;
    const difficulty = req.query.difficulty as DifficultyLevel | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const records = await getLeaderboard(mode, difficulty, limit);

    res.json({
      leaderboard: records.map((r, i) => ({
        rank: i + 1,
        id: r.id,
        displayName: r.displayName,
        avatarUrl: r.avatarUrl,
        elapsedMs: r.elapsedMs,
        collisions: r.collisions,
        difficulty: r.difficulty,
        totalLaps: r.totalLaps,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    console.error("Leaderboard error:", err);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

router.get("/history", requireAuth, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const records = await getUserHistory(req.user!.userId, limit);

    res.json({ history: records });
  } catch (err) {
    console.error("History error:", err);
    res.status(500).json({ error: "Failed to fetch game history" });
  }
});

export default router;
