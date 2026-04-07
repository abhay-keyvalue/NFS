import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import {
  verifyGoogleTokenAndUpsertUser,
  signJwt,
  getUserById,
} from "../services/auth.service";

const router = Router();

router.post("/google", async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      res.status(400).json({ error: "idToken is required" });
      return;
    }

    const user = await verifyGoogleTokenAndUpsertUser(idToken);
    const token = signJwt(user);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err) {
    console.error("Google auth error:", err);
    res.status(401).json({ error: "Google authentication failed" });
  }
});

router.get("/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await getUserById(req.user!.userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
