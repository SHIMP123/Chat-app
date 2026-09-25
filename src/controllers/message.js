import { db } from "../db/db.js";
import { messageSchema } from "../db/schema.js";

export async function getMessage(req, res){
    try{
        const data = await db.select().from(messageSchema);

        res.json({ data });
    }catch(e){
        console.error(`Error getting messages: ${e}`);

        res.status(500).json({
            message: "Internal server error."
        })
    }
}