import { Router, type IRouter } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db, memosTable } from "@workspace/db";
import { requireAuth } from "../middlewares/session";

const router: IRouter = Router();

type AuthRequest = import("express").Request & { user: { id: string; email: string } };

function getUserId(req: import("express").Request): string {
  return (req as AuthRequest).user.id;
}

router.use(requireAuth);

router.get("/memos", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const memos = await db.select().from(memosTable).where(eq(memosTable.userId, userId)).orderBy(desc(memosTable.updatedAt));
  res.json({ memos: memos.map(serializeMemo) });
});

router.post("/memos", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const { title, content, remindAt, imageDataUrl } = req.body as { title?: string; content?: string; remindAt?: string | null; imageDataUrl?: string | null };

  if (!title || !title.trim()) {
    res.status(400).json({ error: "标题不能为空" });
    return;
  }

  const [memo] = await db.insert(memosTable).values({
    userId,
    title: title.trim(),
    content: content?.trim() || null,
    remindAt: remindAt ? new Date(remindAt) : null,
    imageDataUrl: imageDataUrl || null,
  }).returning();

  res.status(201).json({ memo: serializeMemo(memo) });
});

router.put("/memos/:id", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { title, content, remindAt, imageDataUrl, completedAt } = req.body as { title?: string; content?: string; remindAt?: string | null; imageDataUrl?: string | null; completedAt?: string | null };

  if (!title || !title.trim()) {
    res.status(400).json({ error: "标题不能为空" });
    return;
  }

  const [existing] = await db.select().from(memosTable).where(and(eq(memosTable.id, rawId), eq(memosTable.userId, userId)));
  if (!existing) {
    res.status(404).json({ error: "备忘录不存在" });
    return;
  }

  const newRemindAt = remindAt ? new Date(remindAt) : null;
  const reminderAcknowledgedAt = newRemindAt?.toISOString() !== existing.remindAt?.toISOString() ? null : existing.reminderAcknowledgedAt;

  const [memo] = await db.update(memosTable).set({
    title: title.trim(),
    content: content?.trim() || null,
    remindAt: newRemindAt,
    imageDataUrl: imageDataUrl || null,
    reminderAcknowledgedAt,
    completedAt: completedAt ? new Date(completedAt) : null,
    updatedAt: new Date(),
  }).where(and(eq(memosTable.id, rawId), eq(memosTable.userId, userId))).returning();

  res.json({ memo: serializeMemo(memo) });
});

router.delete("/memos/:id", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [deleted] = await db.delete(memosTable).where(and(eq(memosTable.id, rawId), eq(memosTable.userId, userId))).returning({ id: memosTable.id });
  if (!deleted) {
    res.status(404).json({ error: "备忘录不存在" });
    return;
  }
  res.json({ ok: true });
});

router.post("/memos/:id/ack-reminder", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [existing] = await db.select().from(memosTable).where(and(eq(memosTable.id, rawId), eq(memosTable.userId, userId)));
  if (!existing) {
    res.status(404).json({ error: "备忘录不存在" });
    return;
  }

  const [memo] = await db.update(memosTable).set({ reminderAcknowledgedAt: new Date(), updatedAt: new Date() }).where(and(eq(memosTable.id, rawId), eq(memosTable.userId, userId))).returning();

  res.json({ memo: serializeMemo(memo) });
});

function serializeMemo(memo: typeof memosTable.$inferSelect) {
  return {
    ...memo,
    remindAt: memo.remindAt?.toISOString() || null,
    reminderAcknowledgedAt: memo.reminderAcknowledgedAt?.toISOString() || null,
    completedAt: memo.completedAt?.toISOString() || null,
    createdAt: memo.createdAt.toISOString(),
    updatedAt: memo.updatedAt.toISOString(),
  };
}

export default router;
