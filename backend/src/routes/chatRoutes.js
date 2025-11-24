import { Router } from "express";
import { handleChat } from "../controllers/chatController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

router.post("/chat", authMiddleware, handleChat);

export default router;
