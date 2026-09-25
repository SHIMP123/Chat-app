const ws = new WebSocket(`${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}`);

const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");
const messages = document.getElementById("messages");

let currentUserId = null;
let replyTo = null;
let currentlyEditing = null;

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);
const isOwnedMessage = (container) => container && currentUserId !== null &&
    Number(container.dataset.userId) === currentUserId;


async function displayMessages(message){
    try{
        let html = "";

        if(message.type === "system"){
            html = `
                <div class="message-container">
                    <p>${escapeHtml(message.message)}</p>
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

            const isOwner = message.userId != null && Number(message.userId) === currentUserId;

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
                            ↩ ${escapeHtml(replyMsg)}
                        </div>` : "";

            html = `
            <div class="message-container" data-id="${message.id}" data-user-id="${message.userId ?? ""}">
                ${reply}
                <div class="message-header">
                    <span class="message-username">
                        ${escapeHtml(message.username)}
                    </span>
                </div>
                <p class="message-content">
                    ${escapeHtml(message.content)}
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
    }
}

async function loadMessages() {
    const response = await fetch("/messages", {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("sessionToken")}` }
    });
    if (response.status === 401) {
        sessionStorage.removeItem("sessionToken");
        window.location.replace("/login.html");
        return;
    }
    if (!response.ok) throw new Error("Failed to load messages");

    const data = await response.json();

    for(const message of data.data){
        await displayMessages({
            type: "message",
            userId: message.userId,
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

        if(isOwnedMessage(messageContainer) && id && ws.readyState === WebSocket.OPEN){
            ws.send(JSON.stringify({ type: "delete", id: id }));
        }
    }

    if(e.target.classList.contains("reply-button")){
        const messageContainer = e.target.closest(".message-container");
        const id = messageContainer ? messageContainer.dataset.id : null;

        replyTo = id;
        console.log(replyTo);
    }

    if(e.target.classList.contains("edit-button")){
        const messageContainer = e.target.closest(".message-container");
        if (!isOwnedMessage(messageContainer)) return;

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

ws.onopen = () => {
    const token = sessionStorage.getItem("sessionToken");
    if (!token) {
        ws.close();
        window.location.replace("/login.html");
        return;
    }
    ws.send(JSON.stringify({ type: "auth", token }));
}

ws.onclose = (event) => {
    if (event.code === 1008) {
        sessionStorage.removeItem("sessionToken");
        window.location.replace("/login.html");
    }
};

document.getElementById("message-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();

    if(!message) return;
    if(ws.readyState !== WebSocket.OPEN || currentUserId === null) return;

    if(currentlyEditing){
        const container = document.querySelector(`.message-container[data-id="${currentlyEditing}"]`);
        if (!isOwnedMessage(container)) return;
        ws.send(JSON.stringify({
            type: "edit",
            editId: currentlyEditing,
            content: message,
        }))

        messageInput.value = "";
        currentlyEditing = null;
        sendButton.textContent = "Send";

        return;
    }

    if(ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: "message", 
            message: message,
            replyTo: replyTo
        }));
        
        messageInput.value = "";
    }
    
})

ws.onmessage = (event) => {
    const message = JSON.parse(event.data);

    if (message.type === "authenticated") {
        currentUserId = message.userId;
        document.getElementById("current-username").textContent = message.username;
        loadMessages();
    } else if(message.type === "delete"){
        const messageEl = document.querySelector(`[data-id='${message.id}']`);

        if(messageEl){
            messageEl.remove();
        }   
    }else if(message.type === "edited"){
        const messageEl = document.querySelector(`[data-id='${message.id}']`);

        if(messageEl){
            const messageContent = messageEl.querySelector(".message-content");

            messageContent.textContent = message.content;
        }  
    }else if(message.type === "error"){
        console.error(message.message);
    }else{
        displayMessages(message);
    }
}
