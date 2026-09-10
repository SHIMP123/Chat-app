import express from "express";
import { WebSocketServer } from "ws";

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(express.json());
app.use(express.static("public"));

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

    ws.on("message", (message) => {
        try{
            console.log(`Recieved message: ${message.toString()}`);

            const data = JSON.parse(message.toString());

            if(data.type === "join"){
                username = data.username
                for(const client of wss.clients){
                    if(client.readyState === 1){
                        client.send(`${username} has entered the chat!`)
                    }
                }
            }

            if(data.type === "message"){
                if(data.username){
                    username = data.username;
                }

                for (const client of wss.clients) {
                    if(client.readyState === 1){
                        client.send(`${username}: ${data.message}`);
                    }
                }
            }
        }catch(e){
            console.error(`Failed to parse message: ${e.message}`)
        }
    })


    ws.on("close", () => {
        console.log("Client disconnected");
        for(const client of wss.clients){
            if(client.readyState === 1){
                client.send(`${username} left the chat.`)
            }
        }
    })
})