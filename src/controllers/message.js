import { db } from "../db/db.js";
import { eq, sql, and, asc, desc, lt} from "drizzle-orm";
import { messageSchema,
         usersSchema,
         profileSchema,
         userReadPositionsSchema
        } from "../db/schema.js";

export async function getMessage(req, res){
    try{
        const currentUserId = req.user.userId;

        const limit = 30;
        const beforeId = req.query.before ? Number(req.query.before) : null;

        if( beforeId !== null && (!Number(req.query.before) || beforeId <= 0) ){
            return res.status(400).json({
                message: "Invalid before parameters."
            });
        }



        let query = db.select({
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
        );

        if( beforeId !== null){
            query = query.where(lt(messageSchema.id, beforeId));
        }

        const row = await query
                        .orderBy(desc(messageSchema.id))
                        .limit(limit + 1);
        const hasMore = row.length > limit;
        const data = row.slice(0, limit)
                        .reverse();

        res.json({ data, hasMore });

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