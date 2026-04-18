import { pgTable, text, uuid, integer } from "drizzle-orm/pg-core";

export const preferencesTable = pgTable("preferences", {
  userId: uuid("user_id").primaryKey(),
  locale: text("locale").notNull().default("zh-CN"),
  holidayRegion: text("holiday_region").notNull().default("CN"),
  holidayWindowDays: integer("holiday_window_days").notNull().default(90),
  timezone: text("timezone").notNull().default("Asia/Shanghai"),
});

export type Preferences = typeof preferencesTable.$inferSelect;
