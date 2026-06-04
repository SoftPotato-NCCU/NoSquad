import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

export const redis = new Redis(REDIS_URL, {
  lazyConnect: true,
  enableReadyCheck: false,
  maxRetriesPerRequest: 1,
});

redis.on("error", (err) => {
  console.error("[redis] connection error:", err.message);
});

export const TOKEN_TTL = 365 * 24 * 60 * 60; // 1 year in seconds

export function tokenKey(token: string) {
  return `token:${token}`;
}
