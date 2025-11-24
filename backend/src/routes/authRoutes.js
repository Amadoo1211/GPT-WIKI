import { Router } from "express";
import { confirmMagicLink, googleLogin, requestMagicLink, fetchGoogleClientId } from "../controllers/authController.js";

const router = Router();

router.post("/login", requestMagicLink);
router.get("/login", confirmMagicLink);
router.post("/google", googleLogin);
router.get("/google/client-id", fetchGoogleClientId);

export default router;
