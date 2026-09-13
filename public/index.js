const ws = new WebSocket("ws://localhost:5000");

const messageInput = document.getElementById("message-input");
const usernameInput = document.getElementById("username-input");
const sendButton = document.getElementById("send-button");
const joinBtn = document.getElementById("join-button");
const messages = document.getElementById("messages");

let username = "";

async function loadMessages() {
    try{
        const response = await fetch("/messages");

        const data = await response.json();

        for(const message of data.data){
            const messageEl = document.createElement("p");

            messageEl.textContent = `
                ${message.username}: ${message.content}
            `
            messages.appendChild(messageEl);

            messages.scrollTop = messages.scrollHeight;
        }
    }catch(e){
        console.error(e)
        ws.json({ type: "Error", message: "Resource not found." })
    }
}

joinBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if(username){
        return;
    }

    username = usernameInput.value.trim();

    if(!username){
        return;
    }

    if(ws.readyState === WebSocket.OPEN){
        ws.send(JSON.stringify({ type: "join", username: username }));
        usernameInput.disabled = true;
        joinBtn.disabled = true
    }
})

ws.onopen = () => {
    console.log("Connected to server!");
}

document.getElementById("message-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();

    if(!message) return;

    if(ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({type: "message", username: username, message: message}));
        messageInput.value = "";
    }
    
})

ws.onmessage = (event) => {
    const message = event.data;
    const messageEl = document.createElement("p");

    messageEl.textContent = message;
    messages.appendChild(messageEl);

    messages.scrollTop = messages.scrollHeight;
}

ws.onclose = () => {
    
    if(username) return;

    ws.send(JSON.stringify({ type: "system", message: `${username} left the chat.` }))
}

loadMessages();
