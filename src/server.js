import express from "express";
import { WebSocketServer } from "ws";

const app = express();
const PORT = Number(process.env.PORT) || 8000;

app.get("/", (req, res) => {
    console.log("Chat app is running!");
})

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
})