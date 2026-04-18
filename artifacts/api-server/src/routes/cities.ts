import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, citiesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/session";
import { searchCities } from "../lib/providers";

const router: IRouter = Router();

type AuthRequest = import("express").Request & { user: { id: string; email: string } };

function getUserId(req: import("express").Request): string {
  return (req as AuthRequest).user.id;
}

router.use(requireAuth);

router.get("/cities", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const cities = await listCities(userId);
  res.json({ cities: cities.map(serializeCity) });
});

router.post("/cities/search", async (req, res): Promise<void> => {
  const { query } = req.body as { query?: string };
  if (!query?.trim()) {
    res.json({ results: [] });
    return;
  }
  const results = await searchCities(query.trim());
  res.json({ results });
});

router.post("/cities", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const { name, country, latitude, longitude, timezone, isDefault } = req.body as { name?: string; country?: string; latitude?: number; longitude?: number; timezone?: string; isDefault?: boolean };

  if (!name || latitude == null || longitude == null) {
    res.status(400).json({ error: "城市信息不完整" });
    return;
  }

  if (isDefault) {
    await db.update(citiesTable).set({ isDefault: false }).where(eq(citiesTable.userId, userId));
  }

  const existing = await db.select().from(citiesTable).where(and(eq(citiesTable.userId, userId), eq(citiesTable.name, name)));
  const shouldBeDefault = isDefault || existing.length === 0;

  if (shouldBeDefault && !isDefault) {
    await db.update(citiesTable).set({ isDefault: false }).where(eq(citiesTable.userId, userId));
  }

  if (existing.length > 0) {
    if (shouldBeDefault) {
      await db.update(citiesTable).set({ isDefault: true }).where(eq(citiesTable.id, existing[0].id));
    }
    const cities = await listCities(userId);
    res.status(201).json({ cities: cities.map(serializeCity) });
    return;
  }

  await db.insert(citiesTable).values({
    userId,
    name,
    country: country || null,
    latitude: Number(latitude),
    longitude: Number(longitude),
    timezone: timezone || "Asia/Shanghai",
    isDefault: shouldBeDefault,
  });

  const cities = await listCities(userId);
  res.status(201).json({ cities: cities.map(serializeCity) });
});

router.post("/cities/:id/default", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [city] = await db.select().from(citiesTable).where(and(eq(citiesTable.id, rawId), eq(citiesTable.userId, userId)));
  if (!city) {
    res.status(404).json({ error: "城市不存在" });
    return;
  }

  await db.update(citiesTable).set({ isDefault: false }).where(eq(citiesTable.userId, userId));
  await db.update(citiesTable).set({ isDefault: true }).where(eq(citiesTable.id, rawId));

  const cities = await listCities(userId);
  res.json({ cities: cities.map(serializeCity) });
});

router.delete("/cities/:id", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [city] = await db.select().from(citiesTable).where(and(eq(citiesTable.id, rawId), eq(citiesTable.userId, userId)));
  if (!city) {
    res.status(404).json({ error: "城市不存在" });
    return;
  }

  await db.delete(citiesTable).where(and(eq(citiesTable.id, rawId), eq(citiesTable.userId, userId)));

  if (city.isDefault) {
    const remaining = await db.select().from(citiesTable).where(eq(citiesTable.userId, userId));
    if (remaining.length > 0) {
      await db.update(citiesTable).set({ isDefault: true }).where(eq(citiesTable.id, remaining[0].id));
    }
  }

  const cities = await listCities(userId);
  res.json({ cities: cities.map(serializeCity) });
});

async function listCities(userId: string) {
  return db.select().from(citiesTable).where(eq(citiesTable.userId, userId)).orderBy(citiesTable.name);
}

function serializeCity(city: typeof citiesTable.$inferSelect) {
  return {
    id: city.id,
    name: city.name,
    country: city.country,
    latitude: city.latitude,
    longitude: city.longitude,
    timezone: city.timezone,
    isDefault: city.isDefault,
  };
}

export default router;
