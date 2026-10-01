import express from "express";
import { getUser, login, register } from "../controllers/auth.js";
import { authenticationToken } from "../Middleware/authMiddleware.js";

const router =  express.Router();

router.get("/Users", authenticationToken ,getUser);
router.post("/registration", register);
router.post("/login", login);

export default router;