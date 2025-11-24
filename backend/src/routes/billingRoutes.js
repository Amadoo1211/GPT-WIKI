import express from "express";
import { createSession, webhook } from "../controllers/billingController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/create-checkout-session", authMiddleware, createSession);
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    req.rawBody = req.body;
    next();
  },
  webhook
);

export default router;
