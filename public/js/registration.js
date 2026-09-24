document.getElementById("registration-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const error = document.getElementById("auth-error");
    error.textContent = "";

    try {
        const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: document.getElementById("username").value.trim(),
                password: document.getElementById("password").value
            })
        });
        const result = await response.json();
        if (!response.ok) {
            error.textContent = result.message || "Registration failed.";
            return;
        }

        window.location.assign("/login.html");
    } catch {
        error.textContent = "Registration failed. Please try again.";
    }
});
