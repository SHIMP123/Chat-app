import express from "express";
import { getUser, login, register, logout } from "../controllers/auth.js";
import { authenticationToken } from "../Middleware/authMiddleware.js";

const router =  express.Router();

router.get("/Users", authenticationToken ,getUser);
router.post("/registration", register);
router.post("/login", login);
router.post("/logout", logout);

export default router;