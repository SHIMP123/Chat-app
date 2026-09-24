import express from "express";
import { db } from "./db/db.js";
import { eq } from "drizzle-orm";
import { messageSchema } from "./db/schema.js";
import { WebSocketServer } from "ws";
import messagesRouter from "./routes/messagesRouter.js";
import authRouter from "./routes/auth.js"

async function deleteMessage(messageId){
    try{
        const deletedRow = await db.delete(messageSchema).where(eq(messageSchema.id, messageId)).returning();

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
    console.log(`ws://localhost:5000`);
})

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
    console.log("New client connected!");

    let username = "";

    ws.on("message", async(message) => {
        try{

            const data = JSON.parse(message.toString());
            const messages = await db.select().from(messageSchema)

            if(data.type === "join"){
                username = data.username
                for(const client of wss.clients){
                    if(client.readyState === 1){
                        client.send(JSON.stringify({ 
                            type: "system",
                            message: `${username} joined the chat!`
                         }))
                        console.log(messages)
                    }
                }
            }

            if(data.type === "message"){
                if(data.username){
                    username = data.username;
                }

                const userId = 1;

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
                            username: username,
                            content: data.message,
                            replyTo: data.replyTo
                        }));
                    }
                }
            }

            if(data.type === "delete"){
                const deleted = await deleteMessage(Number(data.id))

                if(!deleted || deleted.length === 0){
                    console.error("Invalid message Id recieved: ", data.id)
                }

                console.log(deleted);

                for(const client of wss.clients){
                    if(client.readyState === 1){
                        client.send(JSON.stringify({
                            type: "delete",
                            id: data.id
                        }))
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
            console.error(`Failed to parse message: ${e.message}`)
        }
    })


    ws.on("close", () => {
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