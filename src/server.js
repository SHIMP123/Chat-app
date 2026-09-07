import express from "express";
import { WebSocketServer } from "ws";

const app = express();
const PORT = Number(process.env.PORT) || 8000;

app.use(express.json());
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.send("Chat app is running");
})

const server = app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
})

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
    console.log("New client connected!");
})