import { Router } from "express";
import { handleDeepResearch } from "../controllers/researchController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

router.post("/deep-research", authMiddleware, handleDeepResearch);

export default router;
