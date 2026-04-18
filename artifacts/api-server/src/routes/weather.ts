import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, citiesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/session";
import { getWeather } from "../lib/providers";

const router: IRouter = Router();

type AuthRequest = import("express").Request & { user: { id: string; email: string } };

router.get("/weather", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthRequest).user.id;
  const cities = await db.select().from(citiesTable).where(eq(citiesTable.userId, userId));
  const city = cities.find((c) => c.isDefault) || cities[0] || null;

  if (!city) {
    res.json({ weather: null });
    return;
  }

  try {
    const weather = await getWeather(city);
    res.json({ weather });
  } catch {
    req.log.warn("Weather fetch failed");
    res.json({ weather: null });
  }
});

export default router;
