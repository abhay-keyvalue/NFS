import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { AppDataSource } from "../config/database";
import { GameRecord } from "../entities/GameRecord";

const router = Router();

// Admin endpoint to clear invalid/hacked data
// DELETE /api/admin/clear-invalid-data
router.delete("/clear-invalid-data", requireAuth, async (req: Request, res: Response) => {
  try {
    const gameRepo = AppDataSource.getRepository(GameRecord);
    
    // Delete records with impossibly fast times (less than 60 seconds = 60000ms)
    const minValidTime = 60000; // 1 minute
    
    console.log(`[Admin] Searching for records with elapsedMs < ${minValidTime}...`);
    
    // First, get the records to show what will be deleted
    const hackedRecords = await gameRepo
      .createQueryBuilder("game")
      .leftJoinAndSelect("game.user", "user")
      .where("game.elapsedMs < :minTime", { minTime: minValidTime })
      .getMany();
    
    console.log(`[Admin] Found ${hackedRecords.length} suspicious records`);
    
    if (hackedRecords.length === 0) {
      res.json({
        success: true,
        message: "No suspicious records found",
        deleted: 0,
        records: []
      });
      return;
    }
    
    // Log the records being deleted
    const recordDetails = hackedRecords.map(record => ({
      id: record.id,
      userId: record.userId,
      displayName: record.user?.displayName || "Unknown",
      elapsedMs: record.elapsedMs,
      gameMode: record.gameMode,
      createdAt: record.createdAt
    }));
    
    recordDetails.forEach(record => {
      console.log(`[Admin] Deleting - ID: ${record.id}, User: ${record.displayName}, Time: ${record.elapsedMs}ms`);
    });
    
    // Delete the records
    const result = await gameRepo
      .createQueryBuilder()
      .delete()
      .from(GameRecord)
      .where("elapsedMs < :minTime", { minTime: minValidTime })
      .execute();
    
    console.log(`[Admin] Successfully deleted ${result.affected} records`);
    
    res.json({
      success: true,
      message: `Successfully deleted ${result.affected} suspicious records`,
      deleted: result.affected,
      records: recordDetails
    });
  } catch (error) {
    console.error("[Admin] Error clearing invalid data:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to clear invalid data",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Admin endpoint to get statistics about invalid data
// GET /api/admin/invalid-data-stats
router.get("/invalid-data-stats", requireAuth, async (req: Request, res: Response) => {
  try {
    const gameRepo = AppDataSource.getRepository(GameRecord);
    const minValidTime = 60000; // 1 minute
    
    const hackedRecords = await gameRepo
      .createQueryBuilder("game")
      .leftJoinAndSelect("game.user", "user")
      .where("game.elapsedMs < :minTime", { minTime: minValidTime })
      .getMany();
    
    const recordDetails = hackedRecords.map(record => ({
      id: record.id,
      userId: record.userId,
      displayName: record.user?.displayName || "Unknown",
      elapsedMs: record.elapsedMs,
      gameMode: record.gameMode,
      totalLaps: record.totalLaps,
      collisions: record.collisions,
      createdAt: record.createdAt
    }));
    
    res.json({
      success: true,
      count: hackedRecords.length,
      minValidTime,
      records: recordDetails
    });
  } catch (error) {
    console.error("[Admin] Error fetching invalid data stats:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch statistics",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;
