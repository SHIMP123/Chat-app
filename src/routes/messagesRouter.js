import express from "express";
import { getMessage } from "../controllers/message.js";

const router = express.Router();

router.get("/messages", getMessage);

export default router;