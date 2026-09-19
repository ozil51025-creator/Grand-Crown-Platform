import { Router, type IRouter } from "express";
import healthRouter from "./health";
import grandCrownRouter from "./grand-crown";

const router: IRouter = Router();

router.use(healthRouter);
router.use(grandCrownRouter);

export default router;
