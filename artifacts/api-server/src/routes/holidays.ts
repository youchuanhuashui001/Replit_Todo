import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/session";
import { getUpcomingHolidays } from "../lib/providers";

const router: IRouter = Router();

router.get("/holidays", requireAuth, async (req, res): Promise<void> => {
  try {
    const holidays = await getUpcomingHolidays("CN", 90);
    res.json({ holidays });
  } catch {
    req.log.warn("Holidays fetch failed");
    res.json({ holidays: [] });
  }
});

export default router;
