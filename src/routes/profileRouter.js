import express from "express";
import { getProfile, saveProfile } from "../controllers/profileController.js";
import { upload } from "../Middleware/uploadMiddleware.js";
import { authenticationToken } from "../Middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authenticationToken, getProfile);
router.patch("/", authenticationToken, upload.single("avatar"), saveProfile);

export default router;