import crypto from 'node:crypto';
import { ABSOLUTE_TTL_MS, IDLE_TTL_MS } from './config.js';

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password, storedHash) {
  const [salt, expected] = String(storedHash || '').split(':');
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}

export function createSessionToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function buildSessionRecord(userId, rawToken, now = Date.now()) {
  return {
    id: crypto.randomUUID(),
    userId,
    tokenHash: hashToken(rawToken),
    createdAt: new Date(now).toISOString(),
    lastSeenAt: new Date(now).toISOString(),
    idleExpiresAt: new Date(now + IDLE_TTL_MS).toISOString(),
    absoluteExpiresAt: new Date(now + ABSOLUTE_TTL_MS).toISOString(),
    rotatedFromSessionId: null
  };
}

export function isSessionExpired(session, now = Date.now()) {
  if (!session) return true;
  return Date.parse(session.idleExpiresAt) <= now || Date.parse(session.absoluteExpiresAt) <= now;
}

export function touchSession(session, now = Date.now()) {
  return {
    ...session,
    lastSeenAt: new Date(now).toISOString(),
    idleExpiresAt: new Date(now + IDLE_TTL_MS).toISOString()
  };
}
