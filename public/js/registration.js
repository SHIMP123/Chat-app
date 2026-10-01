const usernameEl = document.getElementById("username");
const emailEl = document.getElementById("email");
const passwordEl = document.getElementById("password");
const registrationForm = document.getElementById("registration-form");

registrationForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    try{
        const username = usernameEl.value.trim();
        const email = emailEl.value.trim();
        const password = passwordEl.value.trim();

        const response = await fetch("/api/auth/registration", {
            method: "POST",

            headers: {
                "Content-Type" : "application/json"
            },

            body: JSON.stringify({
                username,
                email,
                password
            })
        });

        if(!response.ok){
            alert(data.message || "Registration failed. Please try again.");
            return;
        }
        const data = await response.json();

        console.log(data)
        window.location.href = "/login.html"
    }catch(e){
        console.error(`Error registering user: ${e}` )
    }
})