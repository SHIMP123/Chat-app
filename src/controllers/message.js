import { db } from "../db/db.js";
import { eq, sql, and, asc} from "drizzle-orm";
import { messageSchema,
         usersSchema,
         profileSchema,
         userReadPositionsSchema
        } from "../db/schema.js";

export async function getMessage(req, res){
    try{
        const currentUserId = req.user.userId;

        const data = await db.select({
            id: messageSchema.id,
            userId: messageSchema.userId,
            username: messageSchema.username,
            content: messageSchema.content,
            replyTo: messageSchema.replyTo,
            createdAt: messageSchema.createdAt,
            avatarUrl: profileSchema.avatarUrl,

            isRead: sql`
                CASE
                    WHEN ${messageSchema.userId} = ${currentUserId}
                        THEN TRUE

                    WHEN ${userReadPositionsSchema.lastReadMessageId} IS NOT NULL
                        AND ${messageSchema.id} <= ${userReadPositionsSchema.lastReadMessageId}
                        THEN TRUE

                    ELSE FALSE
                END
            `.as("is_read")
        }).from(messageSchema)
        .leftJoin(
            usersSchema,
            eq(messageSchema.userId, usersSchema.id)
        )
        .leftJoin(
            profileSchema,
            eq(usersSchema.id, profileSchema.userId)
        )
        .leftJoin(
            userReadPositionsSchema,
            eq(userReadPositionsSchema.userId, currentUserId)
        )
        .orderBy(asc(messageSchema.id));

        res.json({ data });

        console.table(data.map(message => ({
            id: message.id,
            username: message.username,
            isRead: message.isRead
        })));
    }catch(e){
        console.error(`Error getting messages: ${e}`);

        res.status(500).json({
            message: "Internal server error."
        })
    }
}