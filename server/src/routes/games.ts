import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { gameSubmissionRateLimit } from "../middleware/rateLimit";
import { GameMode, DifficultyLevel } from "../entities/GameRecord";
import {
  saveGameRecord,
  getLeaderboard,
  getUserHistory,
} from "../services/game.service";

const router = Router();

router.post("/", requireAuth, gameSubmissionRateLimit, async (req: Request, res: Response) => {
  try {
    const { gameMode, difficulty, totalLaps, elapsedMs, collisions, won } = req.body;

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

    // Validation: Minimum time per lap is ~20 seconds (60 seconds for 3 laps)
    const minTimePerLap = 22065; // 22.065 seconds in milliseconds
    const minTotalTime = minTimePerLap * totalLaps;
    
    if (elapsedMs < minTotalTime) {
      res.status(400).json({ 
        error: "Invalid time: Good try... try again... but in a legit way." 
      });
      return;
    }

    // Validation: Maximum reasonable time (10 minutes per lap)
    const maxTimePerLap = 600000; // 10 minutes
    const maxTotalTime = maxTimePerLap * totalLaps;
    
    if (elapsedMs > maxTotalTime) {
      res.status(400).json({ 
        error: "Invalid time: Time is too long." 
      });
      return;
    }

    // Validation: Collisions should be reasonable (max 1000)
    if (collisions < 0 || collisions > 1000) {
      res.status(400).json({ 
        error: "Invalid collisions count." 
      });
      return;
    }

    // Validation: Total laps should be reasonable (typically 3)
    if (totalLaps < 1 || totalLaps > 10) {
      res.status(400).json({ 
        error: "Invalid number of laps." 
      });
      return;
    }

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
