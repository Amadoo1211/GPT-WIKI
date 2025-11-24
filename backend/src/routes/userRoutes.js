import { Router } from "express";
import { getCurrentUser } from "../controllers/userController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/me", authMiddleware, getCurrentUser);

export default router;
