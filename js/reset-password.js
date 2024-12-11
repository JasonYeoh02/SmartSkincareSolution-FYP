import { auth } from "./firebase-config.js";
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// Function to show toast notification
function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");

    // Hide toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

// Function to handle form submission
document.getElementById("reset-password-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email-input").value;

    try {
        await sendPasswordResetEmail(auth, email);
        showToast("Password reset email sent! Redirecting to login...");

        // Redirect to login after 3 seconds
        setTimeout(() => {
            window.location.href = "login.html";
        }, 2000);
    } catch (error) {
        console.error("Error sending password reset email:", error);
        showToast("Failed to send reset email. Please try again.");
    }
});
