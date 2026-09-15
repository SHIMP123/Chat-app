import express from "express";
import { db } from "./db/db.js";
import { eq } from "drizzle-orm";
import { messageSchema } from "./db/schema.js";
import { WebSocketServer } from "ws";
import messagesRouter from "./routes/messagesRouter.js"

async function deleteMessage(messageId){
    try{
        const deletedRow = await db.delete(messageSchema).where(eq(messageSchema.id, messageId)).returning();

        console.log(deletedRow);
        return deletedRow;
    }catch(e){
        console.error(`Error deleting the message: ${e}`)
    }
} 

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(express.json());
app.use(express.static("public"));
app.use(messagesRouter)

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

                await db.insert(messageSchema).values({
                    username: username,
                    content: data.message
                })

                for (const client of wss.clients) {
                    if(client.readyState === 1){
                        client.send(JSON.stringify({
                            type: "message",
                            username: username,
                            content: data.message
                        }));
                    }
                }
            }

            if(data.type === "delete"){
                await deleteMessage(data.id)
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