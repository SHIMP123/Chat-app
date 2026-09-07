const ws = new WebSocket("ws://localhost:8000");

ws.onopen(() => {
    console.log("Hello from client!");
})

ws.send("Hello from client!");