import { AppDataSource } from "../config/database";
import { GameCheckpoint } from "../entities/GameCheckpoint";
import { GameSession } from "../entities/GameSession";

const checkpointRepo = () => AppDataSource.getRepository(GameCheckpoint);
const sessionRepo = () => AppDataSource.getRepository(GameSession);

export interface CheckpointData {
  sessionId: string;
  sequenceNumber: number;
  timestamp: number;
  position: { x: number; y: number; z: number };
  velocity: number;
  currentLap: number;
  collisionCount: number;
  rotationY?: number;
}

export interface CheckpointValidationResult {
  valid: boolean;
  reason?: string;
  suspiciousFlags?: string[];
}

const MAX_VELOCITY = 200;
const MAX_POSITION_JUMP = 100;
const MIN_CHECKPOINT_INTERVAL = 3000;
const MAX_CHECKPOINT_INTERVAL = 15000;

export async function saveCheckpoint(data: CheckpointData): Promise<GameCheckpoint> {
  const checkpoint = checkpointRepo().create({
    sessionId: data.sessionId,
    sequenceNumber: data.sequenceNumber,
    timestamp: data.timestamp,
    positionX: data.position.x,
    positionY: data.position.y,
    positionZ: data.position.z,
    velocity: data.velocity,
    currentLap: data.currentLap,
    collisionCount: data.collisionCount,
    rotationY: data.rotationY ?? null,
  });

  return checkpointRepo().save(checkpoint);
}

export async function validateCheckpoint(
  data: CheckpointData
): Promise<CheckpointValidationResult> {
  const suspiciousFlags: string[] = [];

  const session = await sessionRepo().findOne({
    where: { id: data.sessionId },
  });

  if (!session) {
    return { valid: false, reason: "Invalid session" };
  }

  if (session.used) {
    return { valid: false, reason: "Session already used" };
  }

  const now = new Date();
  if (now > session.expiresAt) {
    return { valid: false, reason: "Session expired" };
  }

  if (data.velocity > MAX_VELOCITY) {
    suspiciousFlags.push(`Velocity too high: ${data.velocity}`);
  }

  if (data.velocity < 0) {
    return { valid: false, reason: "Negative velocity" };
  }

  if (data.currentLap < 0 || data.currentLap > session.totalLaps) {
    return { valid: false, reason: "Invalid lap number" };
  }

  if (data.collisionCount < 0) {
    return { valid: false, reason: "Negative collision count" };
  }

  const previousCheckpoints = await checkpointRepo().find({
    where: { sessionId: data.sessionId },
    order: { sequenceNumber: "DESC" },
    take: 1,
  });

  if (previousCheckpoints.length > 0) {
    const prev = previousCheckpoints[0];

    if (data.sequenceNumber !== prev.sequenceNumber + 1) {
      return {
        valid: false,
        reason: `Sequence number mismatch. Expected ${prev.sequenceNumber + 1}, got ${data.sequenceNumber}`,
      };
    }

    const timeDelta = data.timestamp - prev.timestamp;
    if (timeDelta < MIN_CHECKPOINT_INTERVAL) {
      suspiciousFlags.push(`Checkpoints too close: ${timeDelta}ms`);
    }

    if (timeDelta > MAX_CHECKPOINT_INTERVAL) {
      suspiciousFlags.push(`Large time gap between checkpoints: ${timeDelta}ms`);
    }

    if (timeDelta < 0) {
      return { valid: false, reason: "Time went backwards" };
    }

    const positionDelta = Math.sqrt(
      Math.pow(data.position.x - prev.positionX, 2) +
        Math.pow(data.position.y - prev.positionY, 2) +
        Math.pow(data.position.z - prev.positionZ, 2)
    );

    if (positionDelta > MAX_POSITION_JUMP) {
      suspiciousFlags.push(
        `Teleportation detected: moved ${positionDelta.toFixed(2)} units`
      );
    }

    const expectedMaxDistance = (MAX_VELOCITY * timeDelta) / 1000;
    if (positionDelta > expectedMaxDistance * 1.5) {
      suspiciousFlags.push(
        `Impossible movement speed: ${positionDelta.toFixed(2)} units in ${timeDelta}ms`
      );
    }

    if (data.collisionCount < prev.collisionCount) {
      return { valid: false, reason: "Collision count decreased" };
    }

    if (data.currentLap < prev.currentLap) {
      return { valid: false, reason: "Lap number decreased" };
    }
  } else {
    if (data.sequenceNumber !== 0) {
      return {
        valid: false,
        reason: `First checkpoint must have sequence number 0, got ${data.sequenceNumber}`,
      };
    }
  }

  if (suspiciousFlags.length > 0) {
    return { valid: true, suspiciousFlags };
  }

  return { valid: true };
}

export async function getSessionCheckpoints(
  sessionId: string
): Promise<GameCheckpoint[]> {
  return checkpointRepo().find({
    where: { sessionId },
    order: { sequenceNumber: "ASC" },
  });
}

export async function validateFinalSubmission(
  sessionId: string,
  finalData: {
    elapsedMs: number;
    collisionCount: number;
    totalLaps: number;
  }
): Promise<CheckpointValidationResult> {
  const checkpoints = await getSessionCheckpoints(sessionId);
  const suspiciousFlags: string[] = [];

  if (checkpoints.length === 0) {
    suspiciousFlags.push("No checkpoints recorded during gameplay");
    return { valid: true, suspiciousFlags };
  }

  const lastCheckpoint = checkpoints[checkpoints.length - 1];

  if (finalData.collisionCount < lastCheckpoint.collisionCount) {
    return {
      valid: false,
      reason: "Final collision count is less than last checkpoint",
    };
  }

  const collisionDiff = finalData.collisionCount - lastCheckpoint.collisionCount;
  if (collisionDiff > 50) {
    suspiciousFlags.push(
      `Large collision increase after last checkpoint: +${collisionDiff}`
    );
  }

  // Check if last checkpoint lap is close to total laps (accounting for 0-indexing)
  // Last checkpoint should be at lap totalLaps-1 (0-indexed) or totalLaps (if they finished)
  const expectedLastLap = finalData.totalLaps - 1; // 0-indexed
  if (lastCheckpoint.currentLap < expectedLastLap - 1 || lastCheckpoint.currentLap > finalData.totalLaps) {
    suspiciousFlags.push(
      `Lap count mismatch: expected around lap ${expectedLastLap}, last checkpoint at lap ${lastCheckpoint.currentLap}`
    );
  }

  const firstCheckpoint = checkpoints[0];
  const checkpointTimeSpan = lastCheckpoint.timestamp - firstCheckpoint.timestamp;
  const timeDiff = Math.abs(finalData.elapsedMs - checkpointTimeSpan);

  if (timeDiff > 10000) {
    suspiciousFlags.push(
      `Time discrepancy: claimed ${finalData.elapsedMs}ms, checkpoints span ${checkpointTimeSpan}ms`
    );
  }

  const expectedCheckpoints = Math.floor(finalData.elapsedMs / 5000);
  if (checkpoints.length < expectedCheckpoints * 0.5) {
    suspiciousFlags.push(
      `Too few checkpoints: ${checkpoints.length} for ${finalData.elapsedMs}ms game`
    );
  }

  const avgVelocity =
    checkpoints.reduce((sum, cp) => sum + cp.velocity, 0) / checkpoints.length;
  if (avgVelocity > MAX_VELOCITY * 0.9) {
    suspiciousFlags.push(`Suspiciously high average velocity: ${avgVelocity.toFixed(2)}`);
  }

  if (suspiciousFlags.length > 0) {
    return { valid: true, suspiciousFlags };
  }

  return { valid: true };
}

export async function deleteSessionCheckpoints(sessionId: string): Promise<void> {
  await checkpointRepo().delete({ sessionId });
}

export async function getCheckpointStats(sessionId: string) {
  const checkpoints = await getSessionCheckpoints(sessionId);

  if (checkpoints.length === 0) {
    return null;
  }

  const velocities = checkpoints.map((cp) => cp.velocity);
  const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
  const maxVelocity = Math.max(...velocities);
  const minVelocity = Math.min(...velocities);

  const totalDistance = checkpoints.reduce((sum, cp, i) => {
    if (i === 0) return 0;
    const prev = checkpoints[i - 1];
    return (
      sum +
      Math.sqrt(
        Math.pow(cp.positionX - prev.positionX, 2) +
          Math.pow(cp.positionY - prev.positionY, 2) +
          Math.pow(cp.positionZ - prev.positionZ, 2)
      )
    );
  }, 0);

  return {
    checkpointCount: checkpoints.length,
    avgVelocity: parseFloat(avgVelocity.toFixed(2)),
    maxVelocity: parseFloat(maxVelocity.toFixed(2)),
    minVelocity: parseFloat(minVelocity.toFixed(2)),
    totalDistance: parseFloat(totalDistance.toFixed(2)),
    firstCheckpointTime: checkpoints[0].timestamp,
    lastCheckpointTime: checkpoints[checkpoints.length - 1].timestamp,
    timeSpan: checkpoints[checkpoints.length - 1].timestamp - checkpoints[0].timestamp,
  };
}
