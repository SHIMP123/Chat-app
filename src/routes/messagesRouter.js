import express from "express";
import { getMessage } from "../controllers/message.js";
import { messageSchema } from "../db/schema.js";

const router = express.Router();

router.get("/messages", getMessage);

export default router;