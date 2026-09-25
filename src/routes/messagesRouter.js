import express from "express";
import { db } from "../db/db.js";
import { messageSchema } from "../db/schema.js";
import { getSessionUser } from "../session.js";

const router = express.Router();

router.get("/messages", async (req, res) => {
    try{
        const token = req.get("authorization")?.match(/^Bearer ([0-9a-f]{64})$/)?.[1];
        if (!(await getSessionUser(token))) {
            return res.status(401).json({ error: "Authentication required." });
        }

        const data = await db.select().from(messageSchema);

        res.json({ data });
    }catch(e){
        console.error(e);

        res.status(500).json({
            error: "internal server error."
        });
    }
})

export default router;
