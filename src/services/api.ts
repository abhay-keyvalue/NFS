const BASE_URL = import.meta.env.VITE_API_URL || "";

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("nfs_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  displayName: string;
  avatarUrl: string | null;
  elapsedMs: number;
  collisions: number;
  difficulty: string | null;
  totalLaps: number;
  createdAt: string;
}

export interface GameRecordData {
  id: string;
  gameMode: string;
  difficulty: string | null;
  totalLaps: number;
  elapsedMs: number;
  collisions: number;
  won: boolean | null;
  createdAt: string;
}

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

export const api = {
  auth: {
    google: (idToken: string) =>
      request<AuthResponse>("/api/auth/google", {
        method: "POST",
        body: JSON.stringify({ idToken }),
      }),

    me: () => request<{ user: AuthUser }>("/api/auth/me"),
  },

  games: {
    startSession: (data: {
      gameMode: string;
      difficulty?: string | null;
      totalLaps: number;
    }) =>
      request<{ sessionId: string }>("/api/games/start-session", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    save: (data: {
      sessionId: string;
      gameMode: string;
      difficulty?: string | null;
      totalLaps: number;
      elapsedMs: number;
      collisions: number;
      won?: boolean | null;
    }) =>
      request<{ record: GameRecordData }>("/api/games", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    leaderboard: (params?: {
      mode?: string;
      difficulty?: string;
      limit?: number;
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.mode) searchParams.set("mode", params.mode);
      if (params?.difficulty) searchParams.set("difficulty", params.difficulty);
      if (params?.limit) searchParams.set("limit", String(params.limit));
      const qs = searchParams.toString();
      return request<{ leaderboard: LeaderboardEntry[] }>(
        `/api/games/leaderboard${qs ? `?${qs}` : ""}`
      );
    },

    history: (limit?: number) => {
      const qs = limit ? `?limit=${limit}` : "";
      return request<{ history: GameRecordData[] }>(`/api/games/history${qs}`);
    },

    checkpoint: (data: {
      sessionId: string;
      sequenceNumber: number;
      timestamp: number;
      position: { x: number; y: number; z: number };
      velocity: number;
      currentLap: number;
      collisionCount: number;
      rotationY?: number;
    }) =>
      request<{ success: boolean; checkpointId: string; suspiciousFlags: string[] }>(
        "/api/games/checkpoint",
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      ),
  },

  users: {
    profile: () => request<{ profile: UserProfile }>("/api/users/profile"),
  },
};
