import { db } from "../db/db.js";
import { eq } from "drizzle-orm";
import { messageSchema,
         usersSchema,
         profileSchema
        } from "../db/schema.js";

export async function getMessage(req, res){
    try{
        const data = await db.select({
            id: messageSchema.id,
            userId: messageSchema.userId,
            username: messageSchema.username,
            content: messageSchema.content,
            replyTo: messageSchema.replyTo,
            createdAt: messageSchema.createdAt,
            avatarUrl: profileSchema.avatarUrl 
        }).from(messageSchema)
          .leftJoin(usersSchema, eq(messageSchema.userId, usersSchema.id))
          .leftJoin(profileSchema, eq(usersSchema.id, profileSchema.userId));

        res.json({ data });
    }catch(e){
        console.error(`Error getting messages: ${e}`);

        res.status(500).json({
            message: "Internal server error."
        })
    }
}