import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import bootstrapRouter from "./bootstrap";
import memosRouter from "./memos";
import citiesRouter from "./cities";
import weatherRouter from "./weather";
import holidaysRouter from "./holidays";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(bootstrapRouter);
router.use(memosRouter);
router.use(citiesRouter);
router.use(weatherRouter);
router.use(holidaysRouter);

export default router;
