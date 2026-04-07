import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { getUserProfile } from "../services/user.service";

const router = Router();

router.get("/profile", requireAuth, async (req: Request, res: Response) => {
  try {
    const profile = await getUserProfile(req.user!.userId);
    if (!profile) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ profile });
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

export default router;
