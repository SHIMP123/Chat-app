import express from "express";
import { Router } from "express";
import { db } from "../db/db.js";
import { messageSchema } from "../db/schema.js";

const router = express.Router();

router.get("/messages", async (req, res) => {
    try{
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