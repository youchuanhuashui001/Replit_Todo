import { Request, Response, NextFunction } from "express";
import { db, sessionsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashToken, isSessionExpired, touchSessionDates } from "../lib/auth";

export const SESSION_COOKIE = "dashboard_session";

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = (req.cookies as Record<string, string>)[SESSION_COOKIE];
  if (!token) {
    res.status(401).json({ error: "请先登录" });
    return;
  }

  const tokenHash = hashToken(token);
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.tokenHash, tokenHash));

  if (!session || isSessionExpired(session)) {
    if (session) {
      await db.delete(sessionsTable).where(eq(sessionsTable.tokenHash, tokenHash));
    }
    res.status(401).json({ error: "会话已过期，请重新登录" });
    return;
  }

  const touched = touchSessionDates();
  await db.update(sessionsTable).set(touched).where(eq(sessionsTable.id, session.id));

  const [user] = await db.select({ id: usersTable.id, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, session.userId));
  if (!user) {
    res.status(401).json({ error: "用户不存在" });
    return;
  }

  (req as Request & { user: { id: string; email: string } }).user = user;
  next();
}
