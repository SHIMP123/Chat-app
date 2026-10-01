const loginForm = document.getElementById("login-form");
const userEmail = document.getElementById("user-email");
const userUsername = document.getElementById("user-username");
const userPassword = document.getElementById("user-password");


loginForm.addEventListener("submit", async(e) => {
    e.preventDefault();

    const username = userUsername.value.trim();
    const password = userPassword.value.trim();

    if(!username || !password){
        alert("Please enter both username and password!");
        return;
    }

    const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
            "Content-Type" : "application/json"
        },
        body: JSON.stringify({
            username,
            password
        })
    });

    const data = await response.json();

    console.log(data);

    if(!response.ok){
        alert(data.message);
        return;
    }

    localStorage.setItem("token", data.token);
    console.log(`Token saved to local storage: ${data.token}`);

    window.location.href = "/index.html";
})
