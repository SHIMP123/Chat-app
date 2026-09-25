import express from "express";
import { getUser, login, register } from "../controllers/auth.js";

const router =  express.Router();

router.get("/Users", getUser)
router.post("/register", register);
router.post("/login", login)

export default router;