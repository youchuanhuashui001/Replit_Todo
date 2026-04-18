import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, sessionsTable, preferencesTable } from "@workspace/db";
import { hashPassword, verifyPassword, createSessionToken, hashToken, buildSessionDates } from "../lib/auth";
import { requireAuth, SESSION_COOKIE } from "../middlewares/session";

const router: IRouter = Router();

function normalizeEmail(email: string): string {
  return String(email || "").trim().toLowerCase();
}

function validatePassword(password: string): string | null {
  if (typeof password !== "string" || password.length < 8) return "密码至少需要 8 位";
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return "密码需要同时包含字母和数字";
  return null;
}

function setSessionCookie(res: import("express").Response, token: string): void {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}${secure}`);
}

function clearSessionCookie(res: import("express").Response): void {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const { email: rawEmail, password, timezone } = req.body as { email?: string; password?: string; timezone?: string };
  const email = normalizeEmail(rawEmail || "");
  const passwordError = validatePassword(password || "");

  if (!email || passwordError) {
    res.status(400).json({ error: passwordError || "邮箱不能为空" });
    return;
  }

  const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(409).json({ error: "该邮箱已注册" });
    return;
  }

  const [user] = await db.insert(usersTable).values({ email, passwordHash: hashPassword(password!), timezone: timezone || "Asia/Shanghai" }).returning({ id: usersTable.id, email: usersTable.email });

  await db.insert(preferencesTable).values({ userId: user.id, timezone: timezone || "Asia/Shanghai" });

  const token = createSessionToken();
  const { idleExpiresAt, absoluteExpiresAt } = buildSessionDates();
  await db.insert(sessionsTable).values({ userId: user.id, tokenHash: hashToken(token), idleExpiresAt, absoluteExpiresAt });

  setSessionCookie(res, token);
  res.status(201).json({ user });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email: rawEmail, password } = req.body as { email?: string; password?: string };
  const email = normalizeEmail(rawEmail || "");

  const [userRecord] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!userRecord || !verifyPassword(password || "", userRecord.passwordHash)) {
    res.status(401).json({ error: "邮箱或密码错误" });
    return;
  }

  const token = createSessionToken();
  const { idleExpiresAt, absoluteExpiresAt } = buildSessionDates();
  await db.insert(sessionsTable).values({ userId: userRecord.id, tokenHash: hashToken(token), idleExpiresAt, absoluteExpiresAt });

  setSessionCookie(res, token);
  res.status(200).json({ user: { id: userRecord.id, email: userRecord.email } });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  const token = (req.cookies as Record<string, string>)[SESSION_COOKIE];
  if (token) {
    await db.delete(sessionsTable).where(eq(sessionsTable.tokenHash, hashToken(token)));
  }
  clearSessionCookie(res);
  res.status(200).json({ ok: true });
});

router.get("/auth/me", requireAuth, (req, res): void => {
  const user = (req as Request & { user: { id: string; email: string } }).user;
  res.json({ user });
});

export default router;
