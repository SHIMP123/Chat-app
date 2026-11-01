import express from "express";
import { getMessage } from "../controllers/message.js";
import { authenticationToken } from "../Middleware/authMiddleware.js";

const router = express.Router();

router.get("/messages", authenticationToken, getMessage);

export default router;