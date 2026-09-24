import express from "express";
import { db } from "./db/db.js";
import { and, eq } from "drizzle-orm";
import { messageSchema } from "./db/schema.js";
import { getSessionUser } from "./session.js";
import { WebSocketServer } from "ws";
import messagesRouter from "./routes/messagesRouter.js";
import authRouter from "./routes/auth.js"

async function deleteMessage(messageId, userId){
    return db.delete(messageSchema)
             .where(and(eq(messageSchema.id, messageId), eq(messageSchema.userId, userId)))
             .returning();
}

async function editing(messageId, userId, content){
    return db.update(messageSchema)
             .set({ content })
             .where(and(eq(messageSchema.id, messageId), eq(messageSchema.userId, userId)))
             .returning();
}

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(express.json());
app.use(express.static("public"));
app.use(messagesRouter)
app.use("/api/auth", authRouter)

app.get("/", (req, res) => {
    res.send("Chat app is running");
})

const server = app.listen(PORT, () => {
    console.log(`ws://localhost:${PORT}`);
})

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
    console.log("New client connected!");

    let user = null;

    ws.on("message", async(message) => {
        try{

            const data = JSON.parse(message.toString());
            if (!user && data.type === "auth") {
                user = await getSessionUser(data.token);
                if (!user) {
                    ws.close(1008, "Invalid session");
                    return;
                }

                ws.user = user;
                ws.send(JSON.stringify({ type: "authenticated", userId: user.id, username: user.username }));
                for (const client of wss.clients) {
                    if (client.user && client.readyState === 1) {
                        client.send(JSON.stringify({ type: "system", message: `${user.username} joined the chat!` }));
                    }
                }
                return;
            }

            if (!user) {
                ws.close(1008, "Authentication required");
                return;
            }

            if(data.type === "message"){
                if (typeof data.message !== "string" || !data.message.trim()) return;
                const replyTo = data.replyTo == null ? null : Number(data.replyTo);
                if (replyTo !== null && (!Number.isSafeInteger(replyTo) || replyTo <= 0)) return;

                const insertedMessage = await db.insert(messageSchema).values({
                                        userId: user.id,
                                        username: user.username,
                                        content: data.message.trim(),
                                        replyTo
                                    }).returning();

                for (const client of wss.clients) {
                    if(client.user && client.readyState === 1){
                        client.send(JSON.stringify({
                            type: "message",
                            id: insertedMessage[0].id,
                            userId: user.id,
                            username: user.username,
                            content: insertedMessage[0].content,
                            replyTo
                        }));
                    }
                }
            }

            if(data.type === "delete"){
                const id = Number(data.id);
                if (!Number.isSafeInteger(id) || id <= 0) return;
                const deleted = await deleteMessage(id, user.id);

                if (deleted.length === 0) {
                    ws.send(JSON.stringify({ type: "error", message: "Message not found or access denied." }));
                    return;
                }

                for(const client of wss.clients){
                    if(client.user && client.readyState === 1){
                        client.send(JSON.stringify({
                            type: "delete",
                            id
                        }))
                    }
                }
            }

            if(data.type === "edit"){
                const id = Number(data.editId);
                if (!Number.isSafeInteger(id) || id <= 0 || typeof data.content !== "string" || !data.content.trim()) return;
                const edited = await editing(id, user.id, data.content.trim());

                if (edited.length === 0) {
                    ws.send(JSON.stringify({ type: "error", message: "Message not found or access denied." }));
                    return;
                }

                const updatedMessage = edited[0];

                for(const client of wss.clients){
                    if(client.user && client.readyState === 1){
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
            console.error("Failed to handle message:", e);
        }
    })


    ws.on("close", () => {
        if(!user) return;

        console.log("Client disconnected");
        for(const client of wss.clients){
            if(client.user && client.readyState === 1){
                client.send(JSON.stringify({
                    type: "system",
                    message: `${user.username} left the chat.`
                }));
            }
        }
    })
})
