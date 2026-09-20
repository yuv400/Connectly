import express from "express";
import { summarize, ask, generate, translate } from "../controllers/ai.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";

const router = express.Router();

// All AI routes: rate-limited first, then authenticated — same pattern as message.route.js
router.use(arcjetProtection, protectRoute);

router.post("/summarize", summarize);
router.post("/ask", ask);
router.post("/generate-message", generate);
router.post("/translate", translate);

export default router;
