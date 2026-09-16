const ws = new WebSocket("ws://localhost:5000");

const messageInput = document.getElementById("message-input");
const usernameInput = document.getElementById("username-input");
const sendButton = document.getElementById("send-button");
const joinBtn = document.getElementById("join-button");
const messages = document.getElementById("messages");

let username = "";


async function displayMessages(message){
    try{
        let html = "";

        if(message.type === "system"){
            html = `
                <div class="message-container">
                    <p>${message.message}</p>
                </div>
            `
        }

        if(message.type === "message"){
            html = `
            <div class="message-container" data-id="${message.id}">
                <p>${message.username}: ${message.content}</p>
                <button class="options-btn">...</button>

                <div class="menu-container hide">
                    <button class="delete-button">
                        ✖ Delete
                    </button>
                </div>
            </div>
        `
        }

        messages.innerHTML += html;

        messages.scrollTop = messages.scrollHeight;
    }catch(e){
        console.error(e)
        ws.json({ type: "Error", message: "Resource not found." });
    }
}

async function loadMessages() {
    const response = await fetch("/messages");

    const data = await response.json();

    for(const message of data.data){
        displayMessages({
            type: "message",
            username: message.username,
            content: message.content,
            id: message.id
        });
    }
}

messages.addEventListener("click", (e) => {

    if(e.target.classList.contains("delete-button")){
        const messageContainer = e.target.closest(".message-container");
        const id = messageContainer ? messageContainer.dataset.id : null;

        if(id && id !== "undefined" && ws.readyState === WebSocket.OPEN){
            ws.send(JSON.stringify({ type: "delete", id: id }));
        }
    }
})

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
    const message = JSON.parse(event.data);

    if(message.type === "delete"){
        const messageEl = document.querySelector(`[data-id='${message.id}']`);

        if(messageEl){
            messageEl.remove();
        }   
    }else{
        displayMessages(message);
    }
}

loadMessages();
