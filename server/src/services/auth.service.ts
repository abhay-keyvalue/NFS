import jwt from "jsonwebtoken";
import { AppDataSource } from "../config/database";
import { getGoogleClient } from "../config/google";
import { User } from "../entities/User";

const userRepo = () => AppDataSource.getRepository(User);

export async function verifyGoogleTokenAndUpsertUser(idToken: string) {
  const client = getGoogleClient();
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
    throw new Error("Invalid Google token payload");
  }

  let user = await userRepo().findOneBy({ googleId: payload.sub });

  if (!user) {
    user = userRepo().create({
      googleId: payload.sub,
      email: payload.email,
      displayName: payload.name || payload.email.split("@")[0],
      avatarUrl: payload.picture || null,
    });
    user = await userRepo().save(user);
  } else {
    user.displayName = payload.name || user.displayName;
    user.avatarUrl = payload.picture || user.avatarUrl;
    user = await userRepo().save(user);
  }

  return user;
}

export function signJwt(user: User): string {
  return jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );
}

export async function getUserById(userId: string): Promise<User | null> {
  return userRepo().findOneBy({ id: userId });
}
