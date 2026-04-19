import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const memosTable = pgTable("memos", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  title: text("title").notNull(),
  content: text("content"),
  imageDataUrl: text("image_data_url"),
  remindAt: timestamp("remind_at", { withTimezone: true }),
  reminderAcknowledgedAt: timestamp("reminder_acknowledged_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMemoSchema = createInsertSchema(memosTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMemo = z.infer<typeof insertMemoSchema>;
export type Memo = typeof memosTable.$inferSelect;
