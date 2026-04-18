import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, memosTable, citiesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/session";
import { getWeather, getUpcomingHolidays } from "../lib/providers";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

type AuthRequest = import("express").Request & { user: { id: string; email: string } };

router.get("/bootstrap", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthRequest).user.id;
  const user = (req as AuthRequest).user;

  const [memosRaw, citiesRaw] = await Promise.all([
    db.select().from(memosTable).where(eq(memosTable.userId, userId)).orderBy(desc(memosTable.updatedAt)),
    db.select().from(citiesTable).where(eq(citiesTable.userId, userId)).orderBy(citiesTable.name),
  ]);

  const memos = memosRaw.map((m) => ({
    ...m,
    remindAt: m.remindAt?.toISOString() || null,
    reminderAcknowledgedAt: m.reminderAcknowledgedAt?.toISOString() || null,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  }));

  const cities = citiesRaw.map((c) => ({
    id: c.id,
    name: c.name,
    country: c.country,
    latitude: c.latitude,
    longitude: c.longitude,
    timezone: c.timezone,
    isDefault: c.isDefault,
  }));

  const defaultCity = citiesRaw.find((c) => c.isDefault) || citiesRaw[0] || null;

  let weather = null;
  let holidays: import("../lib/providers").Holiday[] = [];

  await Promise.allSettled([
    (async () => {
      if (defaultCity) {
        weather = await getWeather(defaultCity);
      }
    })(),
    (async () => {
      holidays = await getUpcomingHolidays("CN", 90);
    })(),
  ]);

  res.json({ user, memos, cities, weather, holidays, serverTime: new Date().toISOString() });
});

export default router;
