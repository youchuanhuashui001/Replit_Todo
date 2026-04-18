import crypto from "crypto";

const IDLE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ABSOLUTE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString("hex")): string {
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, expected] = String(storedHash || "").split(":");
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

export function createSessionToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function buildSessionDates(now = Date.now()) {
  return {
    idleExpiresAt: new Date(now + IDLE_TTL_MS),
    absoluteExpiresAt: new Date(now + ABSOLUTE_TTL_MS),
  };
}

export function isSessionExpired(session: { idleExpiresAt: Date; absoluteExpiresAt: Date }, now = Date.now()): boolean {
  return session.idleExpiresAt.getTime() <= now || session.absoluteExpiresAt.getTime() <= now;
}

export function touchSessionDates(now = Date.now()) {
  return {
    lastSeenAt: new Date(now),
    idleExpiresAt: new Date(now + IDLE_TTL_MS),
  };
}
