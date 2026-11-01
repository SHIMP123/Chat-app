import express from "express";
import { db } from "./db/db.js";
import { and, eq, inArray, ne, sql, asc, gt } from "drizzle-orm";
import { messageReadsSchema, messageSchema, profileSchema, userReadPositionsSchema } from "./db/schema.js";
import { WebSocketServer } from "ws";
import { getSessionUser } from "./session.js";
import messagesRouter from "./routes/messagesRouter.js";
import authRouter from "./routes/auth.js"
import profileRouter from "./routes/profileRouter.js"
import { unique } from "drizzle-orm/gel-core";

async function deleteMessage(messageId, requestUserId){
    try{
        const deletedRow = await db.delete(messageSchema)
                                   .where(
                                          eq(messageSchema.id, messageId), 
                                          eq(messageSchema.userId, requestUserId))
                                    .returning();

        console.log(deletedRow);
        return deletedRow;
    }catch(e){
        console.error(`Error deleting the message: ${e}`)
    }
} 

async function editing(messageId, content){
    try{
        const updatedMsg = await db.update(messageSchema)
                                    .set({
                                        content: content,
                                    })
                                    .where(eq(messageSchema.id, messageId))
                                    .returning();;
        console.log(updatedMsg);
        
        return updatedMsg;
    }catch(e){
        console.error("Error editing msg: ", e)
    }
}

function broadcastPresence(data){
    wss.clients.forEach((client) => {
        if(client.readyState === 1){
            client.send(JSON.stringify(data));
        }
    });
}

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(express.json());
app.use(express.static("public"));
app.use(messagesRouter);
app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);

app.get("/", (req, res) => {
    res.send("Chat app is running");
})

const server = app.listen(PORT, () => {
    console.log(`ws://localhost:5000`);
})

const wss = new WebSocketServer({ server });

const onlineUsers = new Map();
const onlineUserNames = new Map();

wss.on("connection", async (ws, req) => {
    console.log("New client connected!");

    const url = new URL(req.url, `http://${req.headers.host}`);

    const token = url.searchParams.get("token");

    const user = await getSessionUser(token);

    if (!user){
        console.log("Invalid or missing token.");

        ws.close(1008, "invalid authentication.");
        return;
    }

    const userId = user.id;

    let username = user.username;

    ws.userId = user.id;
    ws.username = user.username;

    ws.send(JSON.stringify({
        type: "auth_success",
        username: username,
        userId: userId
    }));

    const currentlyOnline = onlineUsers.get(userId) || 0;

    onlineUsers.set(userId, currentlyOnline + 1);
    onlineUserNames.set(userId, username);

    ws.send(JSON.stringify({
        type: "presence_snapshot",
        users: [...onlineUsers.keys()].map((userId) => ({
            userId,
            username: onlineUserNames.get(userId)
        })),
    }));

    broadcastPresence({
                        type: "presence",
                        userId: userId,
                        username: username,
                        status: "online"
                    });

    ws.on("message", async(message) => {
        try{

            const data = JSON.parse(message.toString());

            if(data.type === "join"){
                username = user.username;
                for(const client of wss.clients){
                    if(client.readyState === 1){
                        client.send(JSON.stringify({ 
                            type: "system",
                            message: `${username} joined the chat!`
                         }));
                    }
                }
            }

            if(data.type === "message"){
                username = user.username;

                const [profile] = await db.select({
                    avatarUrl: profileSchema.avatarUrl
                    })
                                        .from(profileSchema)
                                        .where(eq(profileSchema.userId, userId));
                
                const avatarUrl = profile?.avatarUrl || "/imgs/default-avatar.jpg" 

                const insertedMessage = await db.insert(messageSchema).values({
                                        userId,
                                        username: username,
                                        content: data.message,
                                        replyTo: data.replyTo ? Number(data.replyTo) : null
                                    }).returning();

                for (const client of wss.clients) {
                    if(client.readyState === 1){
                        client.send(JSON.stringify({
                            type: "message",
                            id: insertedMessage[0].id,
                            userId: userId,
                            username: username,
                            content: data.message,
                            replyTo: data.replyTo,
                            avatarUrl: avatarUrl,
                        }));
                    }
                }
            }

            if(data.type === "mark_read"){
                const messageIds = data.messageIds;

                if (
                    !Array.isArray(messageIds) ||
                    !messageIds.every((id) => Number.isSafeInteger(id) && id > 0)
                ) {
                    console.log("Invalid mark_read event received");
                    return;
                }

                const uniqueMessageIds = [...new Set(messageIds)];

                if(uniqueMessageIds.length === 0){
                    return;
                }

                const eligibleMessages = await db.select({
                                                            id: messageSchema.id,
                                                            senderId: messageSchema.userId
                                                        })
                                                 .from(messageSchema)
                                                 .where(
                                                        and(
                                                            inArray(messageSchema.id, uniqueMessageIds), 
                                                            ne(messageSchema.userId, userId))
                                                    );

                const eligibleMessageIds = eligibleMessages.map((message) => message.id);

                if(eligibleMessageIds.length === 0){
                    return;
                }
                
                await db.insert(messageReadsSchema)
                        .values(
                            eligibleMessageIds.map((messageId) => ({
                                messageId,
                                readerId: userId
                            }))
                        ).onConflictDoNothing();

                const [currentPosition] = await db.select({
                    lastReadMessageId: userReadPositionsSchema.lastReadMessageId
                }).from(userReadPositionsSchema)
                  .where(eq(userReadPositionsSchema.userId, userId));

                const nextMessages = await db.select({
                    id: messageSchema.id,
                    senderId: messageSchema.userId,
                    readId: messageReadsSchema.id
                }).from(messageSchema)
                .leftJoin(
                            messageReadsSchema,
                            and(
                                eq(messageReadsSchema.messageId, messageSchema.id),
                                eq(messageReadsSchema.readerId, userId)
                            )
                        )
                        .where(gt(
                            messageSchema.id,
                            currentPosition.lastReadMessageId ?? 0
                        ))
                        .orderBy(asc(messageSchema.id));

                let lastReadMessage = currentPosition.lastReadMessageId ?? 0;

                for(const message of nextMessages){
                    const isOwnMessage = Number(message.senderId) === Number(userId);
                    const hasBeenRead = message.readId !== null;

                    if( isOwnMessage || hasBeenRead){
                        lastReadMessage = message.id
                    }else{
                        break;
                    }
                }

                if(lastReadMessage > (currentPosition.lastReadMessageId ?? 0)){
                    await db.insert(userReadPositionsSchema)
                        .values({
                            userId: userId,
                            lastReadMessageId: lastReadMessage
                        })
                        .onConflictDoUpdate({
                            target: userReadPositionsSchema.userId,
                            set: {
                                lastReadMessageId: sql`
                                    GREATEST(
                                        ${userReadPositionsSchema.lastReadMessageId},
                                        EXCLUDED.last_message_read_id
                                    )
                                `,
                                updatedAt: new Date()
                            }
                        });
                }

                console.log("LAST READ POSITION: ", lastReadMessage)

                for(const message of eligibleMessages){
                    for(const client of wss.clients){
                        if (client.readyState === 1 && client.userId === message.senderId){
                            console.log("Sending read receipt for:", message.id);
                            client.send(JSON.stringify({
                                type: "read_receipt",
                                messageId: message.id,
                                senderId: message.senderId,
                                readerId: userId,
                                readerUsername: username
                            }));
                        }
                    }
                }

                return;
            }

            if(data.type === "typing"){
                for (const client of wss.clients) {
                    if(client.readyState === 1){
                        client.send(JSON.stringify({
                            type: "typing",
                            userId: userId,
                            username: username,
                        }));
                    }
                }
            }

            if(data.type === "delete"){
                const deleted = await deleteMessage(Number(data.id), userId);

                if(!deleted || deleted.length === 0){
                    console.error("Invalid message Id recieved: ", data.id);
                }

                console.log(deleted);

                for(const client of wss.clients){
                    if(client.readyState === 1){
                        client.send(JSON.stringify({
                            type: "delete",
                            id: data.id
                        }));
                    }
                }
            }

            if(data.type === "edit"){
                const edited = await editing(Number(data.editId), data.content)

                if(!edited || edited.length === 0){
                    console.error(`Message not found: ${data.editId}`);
                    return;
                }

                const updatedMessage = edited[0];

                for(const client of wss.clients){
                    if(client.readyState === 1){
                        client.send(JSON.stringify({
                            type:"edited",
                            id: updatedMessage.id,
                            content: updatedMessage.content,
                            replyTo: updatedMessage.replyTo
                        }));
                    }
                }
            }

        }catch(e){
            console.error(`Failed to parse message: ${e.message}`);
        }
    })


    ws.on("close", () => {
        const currentCount = onlineUsers.get(userId) || 0;

        if(currentCount <= 1){
            onlineUsers.delete(userId);
            onlineUserNames.delete(userId);

            console.log("Broadcasting presence: offline", userId, username);

            broadcastPresence({
                                type: "presence",
                                userId: userId,
                                username: username,
                                status: "offline"
                            });

            console.log(`${username} is now offline.`);
        }else{
            onlineUsers.set(userId, currentCount - 1);
            console.log(`${username} is still connected.`)
        }
        if(!username) return;

        console.log("Client disconnected");
        for(const client of wss.clients){
            if(client.readyState === 1){
                client.send(JSON.stringify({
                    type: "system",
                    message: `${username} left the chat.`
                }));
            }
        }
    })
})