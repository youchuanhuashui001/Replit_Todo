import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DATA_DIR, DB_FILE, DEFAULT_HOLIDAY_REGION, DEFAULT_HOLIDAY_WINDOW_DAYS, DEFAULT_LOCALE } from './config.js';
import { buildSessionRecord, hashToken, isSessionExpired, touchSession } from './auth.js';
import { normalizeEmail, sortByUpdatedDesc } from './domain.js';

function ensureDatabase() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    const initial = {
      users: [],
      sessions: [],
      memos: [],
      cities: [],
      preferences: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
  }
}

function readDb() {
  ensureDatabase();
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDb(db) {
  ensureDatabase();
  const tempFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(db, null, 2));
  fs.renameSync(tempFile, DB_FILE);
}

function defaultPreferences(userId, timezone = 'Asia/Shanghai') {
  return {
    userId,
    locale: DEFAULT_LOCALE,
    holidayRegion: DEFAULT_HOLIDAY_REGION,
    holidayWindowDays: DEFAULT_HOLIDAY_WINDOW_DAYS,
    timezone
  };
}

export class JsonStore {
  createUser({ email, passwordHash, timezone }) {
    const db = readDb();
    const normalizedEmail = normalizeEmail(email);
    if (db.users.some((user) => user.email === normalizedEmail)) {
      throw new Error('EMAIL_EXISTS');
    }

    const user = {
      id: crypto.randomUUID(),
      email: normalizedEmail,
      passwordHash,
      createdAt: new Date().toISOString()
    };
    db.users.push(user);
    db.preferences.push(defaultPreferences(user.id, timezone));
    writeDb(db);
    return { ...user, passwordHash: undefined };
  }

  findUserByEmail(email) {
    const db = readDb();
    return db.users.find((user) => user.email === normalizeEmail(email)) || null;
  }

  findUserById(userId) {
    const db = readDb();
    const user = db.users.find((entry) => entry.id === userId);
    return user ? { ...user, passwordHash: undefined } : null;
  }

  createSession(userId, rawToken) {
    const db = readDb();
    const session = buildSessionRecord(userId, rawToken);
    db.sessions.push(session);
    writeDb(db);
    return session;
  }

  deleteSessionByToken(rawToken) {
    const db = readDb();
    const tokenHash = hashToken(rawToken);
    db.sessions = db.sessions.filter((session) => session.tokenHash !== tokenHash);
    writeDb(db);
  }

  deleteAllSessionsForUser(userId) {
    const db = readDb();
    db.sessions = db.sessions.filter((session) => session.userId !== userId);
    writeDb(db);
  }

  findSession(rawToken) {
    const db = readDb();
    const tokenHash = hashToken(rawToken);
    const now = Date.now();
    let updated = false;

    db.sessions = db.sessions.filter((session) => {
      const expired = isSessionExpired(session, now);
      if (expired) updated = true;
      return !expired;
    });

    const session = db.sessions.find((entry) => entry.tokenHash === tokenHash);
    if (!session) {
      if (updated) writeDb(db);
      return null;
    }

    const touched = touchSession(session, now);
    const index = db.sessions.findIndex((entry) => entry.id === session.id);
    db.sessions[index] = touched;
    writeDb(db);
    return touched;
  }

  getUserFromSession(rawToken) {
    const session = this.findSession(rawToken);
    if (!session) return null;
    return this.findUserById(session.userId);
  }

  listMemos(userId) {
    const db = readDb();
    return sortByUpdatedDesc(db.memos.filter((memo) => memo.userId === userId));
  }

  getMemo(userId, memoId) {
    const db = readDb();
    return db.memos.find((memo) => memo.id === memoId && memo.userId === userId) || null;
  }

  saveMemo(userId, payload, memoId = null) {
    const db = readDb();
    const now = new Date().toISOString();
    if (memoId) {
      const index = db.memos.findIndex((memo) => memo.id === memoId && memo.userId === userId);
      if (index === -1) throw new Error('MEMO_NOT_FOUND');
      const existing = db.memos[index];
      db.memos[index] = {
        ...existing,
        ...payload,
        reminderAcknowledgedAt: payload.remindAt !== existing.remindAt ? null : existing.reminderAcknowledgedAt,
        updatedAt: now
      };
      writeDb(db);
      return db.memos[index];
    }

    const memo = {
      id: crypto.randomUUID(),
      userId,
      title: payload.title,
      content: payload.content,
      imageDataUrl: payload.imageDataUrl || null,
      remindAt: payload.remindAt || null,
      reminderAcknowledgedAt: null,
      createdAt: now,
      updatedAt: now
    };
    db.memos.push(memo);
    writeDb(db);
    return memo;
  }

  deleteMemo(userId, memoId) {
    const db = readDb();
    const before = db.memos.length;
    db.memos = db.memos.filter((memo) => !(memo.id === memoId && memo.userId === userId));
    if (db.memos.length === before) throw new Error('MEMO_NOT_FOUND');
    writeDb(db);
  }

  acknowledgeReminder(userId, memoId) {
    const db = readDb();
    const index = db.memos.findIndex((memo) => memo.id === memoId && memo.userId === userId);
    if (index === -1) throw new Error('MEMO_NOT_FOUND');
    db.memos[index].reminderAcknowledgedAt = new Date().toISOString();
    db.memos[index].updatedAt = new Date().toISOString();
    writeDb(db);
    return db.memos[index];
  }

  listCities(userId) {
    const db = readDb();
    return db.cities
      .filter((city) => city.userId === userId)
      .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name, 'zh-CN'));
  }

  addCity(userId, payload) {
    const db = readDb();
    const duplicate = db.cities.find((city) => city.userId === userId && city.name === payload.name && city.latitude === payload.latitude && city.longitude === payload.longitude);
    if (duplicate) {
      if (payload.isDefault) {
        db.cities = db.cities.map((city) => city.userId === userId ? { ...city, isDefault: city.id === duplicate.id } : city);
        writeDb(db);
      }
      return duplicate;
    }

    const city = {
      id: crypto.randomUUID(),
      userId,
      name: payload.name,
      country: payload.country || '',
      latitude: payload.latitude,
      longitude: payload.longitude,
      timezone: payload.timezone || 'Asia/Shanghai',
      isDefault: Boolean(payload.isDefault),
      createdAt: new Date().toISOString()
    };
    if (city.isDefault) {
      db.cities = db.cities.map((entry) => entry.userId === userId ? { ...entry, isDefault: false } : entry);
    }
    if (!db.cities.some((entry) => entry.userId === userId)) {
      city.isDefault = true;
    }
    db.cities.push(city);
    writeDb(db);
    return city;
  }

  setDefaultCity(userId, cityId) {
    const db = readDb();
    let found = false;
    db.cities = db.cities.map((city) => {
      if (city.userId !== userId) return city;
      if (city.id === cityId) {
        found = true;
        return { ...city, isDefault: true };
      }
      return { ...city, isDefault: false };
    });
    if (!found) throw new Error('CITY_NOT_FOUND');
    writeDb(db);
  }

  deleteCity(userId, cityId) {
    const db = readDb();
    const city = db.cities.find((entry) => entry.id === cityId && entry.userId === userId);
    if (!city) throw new Error('CITY_NOT_FOUND');
    db.cities = db.cities.filter((entry) => !(entry.id === cityId && entry.userId === userId));
    if (city.isDefault) {
      const replacement = db.cities.find((entry) => entry.userId === userId);
      if (replacement) replacement.isDefault = true;
    }
    writeDb(db);
  }

  getPreferences(userId) {
    const db = readDb();
    return db.preferences.find((entry) => entry.userId === userId) || defaultPreferences(userId);
  }

  updatePreferences(userId, patch) {
    const db = readDb();
    const index = db.preferences.findIndex((entry) => entry.userId === userId);
    if (index === -1) {
      db.preferences.push({ ...defaultPreferences(userId), ...patch });
    } else {
      db.preferences[index] = { ...db.preferences[index], ...patch };
    }
    writeDb(db);
    return this.getPreferences(userId);
  }
}

export function resetDatabaseForTests(filePath = DB_FILE) {
  const targetDir = path.dirname(filePath);
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify({ users: [], sessions: [], memos: [], cities: [], preferences: [] }, null, 2));
}
