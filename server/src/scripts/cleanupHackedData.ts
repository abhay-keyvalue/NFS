import { AppDataSource } from "../config/database";
import { GameRecord } from "../entities/GameRecord";

async function cleanupHackedData() {
  try {
    console.log("Initializing database connection...");
    await AppDataSource.initialize();
    
    const gameRepo = AppDataSource.getRepository(GameRecord);
    
    // Delete records with impossibly fast times (less than 60 seconds = 60000ms)
    const minValidTime = 60000; // 1 minute
    
    console.log(`Searching for records with elapsedMs < ${minValidTime}...`);
    
    const hackedRecords = await gameRepo
      .createQueryBuilder("game")
      .where("game.elapsedMs < :minTime", { minTime: minValidTime })
      .getMany();
    
    console.log(`Found ${hackedRecords.length} suspicious records:`);
    hackedRecords.forEach(record => {
      console.log(`  - ID: ${record.id}, User: ${record.userId}, Time: ${record.elapsedMs}ms, Created: ${record.createdAt}`);
    });
    
    if (hackedRecords.length > 0) {
      console.log("\nDeleting suspicious records...");
      
      const result = await gameRepo
        .createQueryBuilder()
        .delete()
        .from(GameRecord)
        .where("elapsedMs < :minTime", { minTime: minValidTime })
        .execute();
      
      console.log(`✅ Successfully deleted ${result.affected} records`);
    } else {
      console.log("✅ No suspicious records found");
    }
    
    await AppDataSource.destroy();
    console.log("\nCleanup completed!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    process.exit(1);
  }
}

cleanupHackedData();
