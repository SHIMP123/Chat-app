const token = localStorage.getItem("token");

console.log(`WebSocket token: ${token}`)

if(!token){
    alert("Please login first!");
    window.location.href = "/login.html"
}

const ws = new WebSocket(
    `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}?token=${token}`
);

//INPUTS
const messageInput = document.getElementById("message-input");
const avatarInput = document.getElementById("avatar-input");
//BUTTONS
const sendButton = document.getElementById("send-button");
const logoutBtn = document.getElementById("logout-button");
const profileBtn = document.getElementById("profile-button");
const customizeProfileBtn = document.getElementById("customize-profile-button");
const saveProfileBtn = document.getElementById("save-profile-button");
const onlineUsersButton = document.getElementById("Online-users-icon");
const closeOnlineUsersPanelButton = document.getElementById("close-online-users-panel");
//DIVS
const messages = document.getElementById("messages");
const profilePanel = document.getElementById("profile-panel");
const closeProfilePanel = document.getElementById("close-profile-panel");
const profileMenu = document.getElementById("profile-menu");
const onlineUsersPanel = document.getElementById("online-users-panel");
const onlineUsersContent = document.getElementById("online-users-content");
const typingIndicator = document.getElementById("typing-indicator");
//IMG
const profilePanelAvatar = document.getElementById("profile-panel-avatar");

let username = "";
let replyTo = null;
let currentlyEditing = null;
let typingTimer;
let currentUserId = null;

const onlineUser = new Set();
const onlineUserNames = new Map();

//HELPER FUNCTIONS
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text ?? "";
    return div.innerHTML;
}
function canMarkMessageAsRead(){
    return isChatVisible();
}
function getVisibleMessages(){
    if(!canMarkMessageAsRead()){
        return [];
    }

    const messageEl = messages.querySelectorAll(".message-container");
    const containerRect = messages.getBoundingClientRect();

    return [...messageEl].filter((element) => {
        const rect = element.getBoundingClientRect();

        return (
                rect.bottom > containerRect.top &&
                rect.top < containerRect.bottom &&
                rect.top < window.innerHeight && 
                rect.bottom > 0
            );
    });
}
function getUnreadCandidateMessages(){
    return getVisibleMessages().filter((element) => {
        return Number(element.dataset.userId) !== Number(currentUserId);
    });
}

//BROWSER VISIBILITY CHECKER
function isChatVisible(){
    return document.visibilityState === "visible";
}
//SEND SEEN MESSAGES
function sendReadReceiptCandidates(){
    if(ws.readyState !== WebSocket.OPEN){
        return;
    }

    const visibleMessages = getUnreadCandidateMessages();

    const messageIds = visibleMessages.map((element) => {
        return Number(element.dataset.id);
    });

    if(messageIds.length === 0){
        return;
    }

    ws.send(JSON.stringify({
        type: "mark_read",
        messageIds: messageIds
    }));

    console.log("Successfully sent read receipt candidates:", messageIds);
}
//FUNCTION TO FORMAT TIME
function formatTimestamp(timeStamp) {
    if(!timeStamp) return "";

    const date = new Date(timeStamp);

    if(Number.isNaN(date.getTime())){
        return "";
    }

    const now = new Date()

    const isToday = date.getDate() === now.getDate() &&
                    date.getMonth() === now.getMonth() &&
                    date.getFullYear() === now.getFullYear()

    if(isToday){
        return date.toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit'
        });
    }
    
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}
//DISPLAY MESSAGES FUNCTION
async function displayMessages(message){
    try{

        let html = "";

        if(message.type === "system"){
            html = `
                <div class="message-container">
                    <p>${message.message}</p>
                </div>
            `;
        }

        if(message.type === "message"){
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
            const isOnline = onlineUser.has(Number(message.userId))

            const statusIndicator = isOnline ? "🟢" : "⚪";

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

            const avatarUrl = message.avatarUrl || "/imgs/default-avatar.jpg";            

            html = `
            <div class="message-container" data-id="${message.id}" data-user-id="${message.userId}">
                <div class="message-profile-pic">
                    <img
                        class="profile-picture"
                        src="${avatarUrl}"
                        alt="Profile picture" 
                    >
                </div>
                ${reply}
                <div class="message-header">
                    <span class="message-username" data-user-id="${message.userId}">
                        ${escapeHtml(message.username)} 
                        <span class="status-indicator">
                            ${statusIndicator}
                        </span>
                    </span>

                    <small class="message-time-stamp">
                        ${formatTimestamp(message.createdAt)}
                    </small>
                </div>
                <p class="message-content">
                    ${message.content}
                </p>
                <small class="read-receipt"></small>
                <button class="options-btn">...</button>

                <div class="menu-container hide">
                    ${options}
                </div>
            </div>
        `
        }

        messages.innerHTML += html;

        messages.scrollTop = messages.scrollHeight;
    }catch(e){
        console.error(e)
        console.error("Internal server error: ", e)
    }
}
//LOAD MESSAGES FUNCTION
async function loadMessages() {
    const response = await fetch("/messages");

    const data = await response.json();

    for(const message of data.data){
        await displayMessages({
            type: "message",
            username: message.username,
            content: message.content,
            userId: message.userId,
            id: message.id,
            replyTo: message.replyTo,
            createdAt: message.createdAt,
            avatarUrl: message.avatarUrl,
            status: message.status
        });
    }

    
    document.querySelectorAll(".message-username[data-user-id]")
        .forEach((usernameEl) => {
            const userId = Number(usernameEl.dataset.userId);
            const indicator = usernameEl.querySelector(".status-indicator");

            if (indicator) {
                indicator.textContent = onlineUser.has(userId) ? "🟢" : "⚪";
            }
        });

        sendReadReceiptCandidates();
}
//LOAD PROFILE
async function loadProfile(){
    const token = localStorage.getItem("token");

    if(!token){
        console.log("No authentiaction token found.");
        window.location.href = "/login.html";
        return
    }

    try{

        const response = await fetch("/api/profile", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if(!response.ok){
            const errorText = await response.text();

            console.error("Profile update failed:", response.status);
            console.error("Server response:", errorText);
            return;
        }

        const data = await response.json();

        document.getElementById("display-name").value = data.displayName || "";
        document.getElementById("bio").value = data.bio || "";
        document.getElementById("status").value = data.status || "";

        const avatarUrl = data.avatarUrl || "/imgs/default-avatar.jpg";

        if(profilePanelAvatar){
            profilePanelAvatar.src = avatarUrl;
        }

        const profileBtnAvatar = document.getElementById("profile-button-avatar");

        if(profileBtnAvatar){
            profileBtnAvatar.src = avatarUrl
        }

        profileBtnAvatar.onerror = () => {
            console.error("Profile button avatar failed to load:", profileBtnAvatar.src);
        };

        profileBtnAvatar.onload = () => {
            console.log("Profile button avatar loaded successfully.");
        };
    
        return data;
    }catch(e){
        console.error("Could not find profile: ", e)
    }
}
//DISPLAY'S ONLINE USERS
async function displayOnlineUsers(){
    
    onlineUsersContent.innerHTML = "";

    onlineUserNames.forEach((username, userId) => {
        const userElement = document.createElement("div");
        userElement.classList.add("online-usernames");

        const usernameElement = document.createElement("span");
        usernameElement.textContent = username;

        const statusElement = document.createElement("span");
        statusElement.textContent = "🟢";

        userElement.append(statusElement, usernameElement);
        onlineUsersContent.append(userElement);
    });

}
//MENU BUTTONS FUNCTIONS
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
        const menu = messageContainer.querySelector(".menu-container");
        const id = messageContainer ? messageContainer.dataset.id : null;

        replyTo = id;

        menu.classList.add("hide")
    }

    if(e.target.classList.contains("edit-button")){
        const messageContainer = e.target.closest(".message-container");
        const menu = messageContainer.querySelector(".menu-container");

        const id = messageContainer ? messageContainer.dataset.id : null;

        const messageContent = messageContainer.querySelector(".message-content");

        const content = messageContent.textContent;

        currentlyEditing = id;

        messageInput.value = content;

        sendButton.textContent = currentlyEditing ? "Save" : "Send";

        messageInput.focus();
        menu.classList.add("hide");
    }
})
//TYPING INDICATOR FUNCTION
messageInput.addEventListener("input", () => {
    if(!messageInput.value.trim()){
        return;
    }

    ws.send(JSON.stringify({
        type: "typing"
    }));
})
//LOGOUT FUNCTION
logoutBtn.addEventListener("click", async () => {

    const token = localStorage.removeItem("token");
    
    const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    if(response.ok){
        localStorage.removeItem(token);
        ws.close();
        window.location.href = "/login.html";
    }
})
//PROFILE HIDE/SHOW FUNCTIONS
profileBtn.addEventListener("click", () => {
    profileMenu.classList.toggle("hide")
})
//BROWSER VISIBILITY CHECKER
document.addEventListener("visibilitychange", () => {
    if(document.visibilityState === "visible"){
        sendReadReceiptCandidates();
    }
})

messages.addEventListener("scroll", () => {
    sendReadReceiptCandidates();
});

customizeProfileBtn.addEventListener("click", () => {
    profileMenu.classList.add("hide");

    profilePanel.classList.add("show");

    loadProfile();
})

closeProfilePanel.addEventListener("click", () => {
    profilePanel.classList.remove("show");
})

saveProfileBtn.addEventListener("click", async () => {
    
    const displayName = document.getElementById("display-name").value;
    const bio = document.getElementById("bio").value;
    const status = document.getElementById("status").value;

    const avatarFile = avatarInput.files[0];

    console.log(`Selected avatar file: ${avatarFile}`);

    const formFile = new FormData();

    formFile.append("displayName", displayName);
    formFile.append("bio", bio);
    formFile.append("status", status);

    if(avatarFile){
        formFile.append("avatar", avatarFile)
    }

    const token = localStorage.getItem("token");

    try{
        const response = await fetch("/api/profile", {
            method: "PATCH",

            headers: {
                Authorization: `Bearer ${token}`
            },

            body: formFile
        });

        if(!response.ok){
            console.log("Error fetching profile.");
            return;
        }

        const data = await response.json();
    
        await loadProfile();
        console.log("Profile data: ", data)
    }catch(e){
        console.error("Error updating profile: ", e)
    }

})

avatarInput.addEventListener("change", () => {
    const file = avatarInput.files[0];

    if(!file){
        return;
    }

    const imageURL = URL.createObjectURL(file);
    
    profilePanelAvatar.src = imageURL;
})

onlineUsersButton.addEventListener("click", () => {
    onlineUsersPanel.classList.add("show");
    displayOnlineUsers();
})

closeOnlineUsersPanelButton.addEventListener("click", () => {
    onlineUsersPanel.classList.remove("show");
})

ws.onopen = () => {
    console.log("Connected to server!");

    ws.send(JSON.stringify({ type: "join" }));
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

ws.onmessage = async (event) => {

    const message = JSON.parse(event.data);

    console.log("Recived websocket event: ", message)

    if(message.type === "auth_success"){
        username = message.username;
        currentUserId = message.userId;
        console.log(`Successfully authenticated user ${username}`);
        await loadMessages();

        console.log(
            "Message containers:",
            messages.querySelectorAll(".message-container").length
        );

        console.log(
            "Messages from others:",
            getUnreadCandidateMessages().length
        );

        console.log(getVisibleMessages().length)

        return;
    }
    if(message.type === "presence"){
        const userId = Number(message.userId);

        if(message.status === "online"){
            onlineUser.add(userId);
            onlineUserNames.set(userId, message.username);
        }else if(message.status === "offline"){
            onlineUser.delete(userId);
            onlineUserNames.delete(userId);
        }
     
        document
            .querySelectorAll(".message-username[data-user-id]")
            .forEach((usernameEl) => {
                const messageUserId = Number(usernameEl.dataset.userId);
                const indicator = usernameEl.querySelector(".status-indicator");

                if (indicator) {
                    indicator.textContent = onlineUser.has(messageUserId)
                        ? "🟢"
                        : "⚪";
                }
            });

        return;
    }

    if(message.type === "presence_snapshot"){
        onlineUser.clear();
        onlineUserNames.clear();

        message.users.forEach((user) => {
            const userId = Number(user.userId);

            onlineUser.add(Number(userId));
            onlineUserNames.set(userId, user.username);
        });

        document.querySelectorAll(".message-username[data-user-id]"
        ).forEach((usernameEl) => {
            const userId = Number(usernameEl.dataset.userId);
            const indicator = usernameEl.querySelector(" .status-indicator");

            if(indicator){
                indicator.textContent = onlineUser.has(userId) ? "🟢" : "⚪";
            }
        })

        displayOnlineUsers();

        return;
    }

    if(message.type === "typing"){
        clearTimeout(typingTimer);

        typingIndicator.textContent = `${message.username} is typing...`
        typingIndicator.classList.add("typing-active");

        typingTimer = setTimeout(() => {
            typingIndicator.textContent = "";
            typingIndicator.classList.remove("typing-active");
        }, 2000);

        return;
    }

    if(message.type === "read_receipt"){
        const messageElement = document.querySelector(`.message-container[data-id="${message.messageId}"]`);

        if(!messageElement){
            console.log("Message not found in chat: ", message.messageId);
            return;
        }

        if(Number(messageElement.dataset.userId) !== Number(currentUserId)){
            return;
        }

        const readReceipt = messageElement.querySelector(".read-receipt");

        if(readReceipt){
            readReceipt.innerHTML = `
                <span class="seen-check">✓✓</span>
                Seen by ${escapeHtml(message.readerUsername)}
            `;

            readReceipt.classList.add("is-seen");
        }

        return;
        
    }

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

loadProfile();