const ws = new WebSocket("ws://localhost:5000");

const messageInput = document.getElementById("message-input");
const usernameInput = document.getElementById("username-input");
const sendButton = document.getElementById("send-button");
const joinBtn = document.getElementById("join-button");
const messages = document.getElementById("messages");

let username = "";
let replyTo = null;
let currentlyEditing = null;


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

            console.log("Message id: ",message.id)
            console.log("Message Reply: ", message.replyTo)

            let replyMsg = "";

            if(message.replyTo){
                const messageEl = document.querySelector(`.message-container[data-id="${message.replyTo}"]`);

                if(messageEl){
                    const parentParagraph = messageEl.querySelector("p");
                    const parentText = parentParagraph ? parentParagraph.textContent : "Original text not found";

                    replyMsg = parentText;
                }
            }

            const isOwner = message.username === username;

            const options = isOwner ? `
                    <button class="reply-button">
                        ↩ Reply
                    </button>

                    <button class="edit-button">
                        ✒ Edit
                    </button>

                    <button class="delete-button">
                        ✖ Delete
                    </button>` 
                    
                    : 

                    `<button class="reply-button">
                        ↩ Reply
                    </button>`;

            const reply = replyMsg ? `
                        <div class="reply-container">
                            ↩ ${replyMsg}
                        </div>` : "";

            html = `
            <div class="message-container" data-id="${message.id}">
                ${reply}
                <div class="message-header">
                    <span class="message-username">
                        ${message.username}
                    </span>
                </div>
                <p class="message-content">
                    ${message.content}
                </p>
                <button class="options-btn">...</button>

                <div class="menu-container hide">
                    ${options}
                </div>
            </div>
        `
        }

        messages.innerHTML += html;

        messages.scrollTop = messages.scrollHeight;

        console.log(message)
    }catch(e){
        console.error(e)
        ws.json({ type: "Error", message: "Resource not found." });
    }
}

async function loadMessages() {
    const response = await fetch("/messages");

    const data = await response.json();

    for(const message of data.data){
        await displayMessages({
            type: "message",
            username: message.username,
            content: message.content,
            id: message.id,
            replyTo: message.replyTo
        });
    }
}

messages.addEventListener("click", (e) => {

    if(e.target.classList.contains("options-btn")){
        const messageContainer =  e.target.closest(".message-container");
        const menu = messageContainer.querySelector(".menu-container");

        document.querySelectorAll(".menu-container").forEach( items => {
            if(items !== menu){
                items.classList.add("hide");
            }
        })

        menu.classList.toggle("hide");
    }

    if(e.target.classList.contains("delete-button")){
        const messageContainer = e.target.closest(".message-container");
        const id = messageContainer ? messageContainer.dataset.id : null;

        if(id && id !== "undefined" && ws.readyState === WebSocket.OPEN){
            ws.send(JSON.stringify({ type: "delete", id: id }));
        }
    }

    if(e.target.classList.contains("reply-button")){
        const messageContainer = e.target.closest(".message-container");
        const id = messageContainer ? messageContainer.dataset.id : null;

        replyTo = id;
        console.log(replyTo);
    }

    //WORK ON THIS
    if(e.target.classList.contains("edit-button")){
        const messageContainer = e.target.closest(".message-container");

        const id = messageContainer ? messageContainer.dataset.id : null;

        const messageContent = messageContainer.querySelector(".message-content");

        const content = messageContent.textContent;

        currentlyEditing = id;

        messageInput.value = content;

        sendButton.textContent = currentlyEditing ? "Save" : "Send";

        messageInput.focus();

        console.log("Editing message: ", currentlyEditing)
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
    if(ws.readyState !== WebSocket.OPEN) return;

    if(currentlyEditing){
        ws.send(JSON.stringify({
            type: "edit",
            editId: currentlyEditing,
            content: message,
        }))

        messageInput.value = "";
        currentlyEditing = null;

        return;
    }

    if(ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: "message", 
            username: username, 
            message: message,
            replyTo: replyTo
        }));
        
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
    }else if(message.type === "edited"){
        const messageEl = document.querySelector(`[data-id='${message.id}']`);

        if(messageEl){
            const messageContent = messageEl.querySelector(".message-content");

            messageContent.textContent = `
                ${message.content}
            `
        }  
    }else{
        displayMessages(message);
    }
}

loadMessages();
