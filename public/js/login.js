document.getElementById("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const error = document.getElementById("auth-error");
    error.textContent = "";

    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: document.getElementById("user-username").value.trim(),
                password: document.getElementById("user-password").value
            })
        });
        const result = await response.json();
        if (!response.ok) {
            error.textContent = result.message || "Login failed.";
            return;
        }

        sessionStorage.setItem("sessionToken", result.token);
        window.location.assign("/");
    } catch {
        error.textContent = "Login failed. Please try again.";
    }
});
