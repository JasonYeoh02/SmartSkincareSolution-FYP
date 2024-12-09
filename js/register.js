// Import necessary Firebase services
import { auth } from "./firebase-config.js";
import { createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Initialize Firestore
const db = getFirestore();

// Password Validation Function
function isValidPassword(password) {
    const minLength = 8;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return password.length >= minLength && hasLetter && hasNumber && hasSpecialChar;
}

// Function to display in-page notifications
function showNotification(message, type = "success") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Append to body and remove after 3 seconds
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Friendly messages based on Firebase error codes
function getFriendlyErrorMessage(errorCode) {
    const errorMessages = {
        "auth/email-already-in-use": "The email address is already in use. Please try logging in or use a different email.",
        "auth/invalid-email": "The email address is invalid. Please check and try again.",
        "auth/operation-not-allowed": "Account creation is currently disabled. Please contact support.",
        "auth/weak-password": "The password is too weak. Please use a stronger password with letters, numbers, and special characters.",
    };
    
    return errorMessages[errorCode] || "An unexpected error occurred. Please try again.";
}

// Register User Function
function registerUser() {
    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const contact = document.getElementById("contact").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    // Basic validation
    if (password !== confirmPassword) {
        showNotification("Passwords do not match.", "error");
        return;
    }

    // Password validation
    if (!isValidPassword(password)) {
        showNotification("Password must be at least 8 characters long, include letters, numbers, and at least one special character.", "error");
        return;
    }

    // Register the user with Firebase Authentication
    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;

            // Set the display name
            updateProfile(user, {
                displayName: username
            }).then(() => {
                // Save additional user data to Firestore
                setDoc(doc(db, 'users', user.uid), {
                    username: username,
                    email: email,
                    contact: contact,
                    membershipStatus: "Active"  // New field for membership status
                }).then(() => {
                    showNotification("Account created successfully!");
                    setTimeout(() => {
                        window.location.href = "/html/login.html";
                    }, 1000);
                }).catch((error) => {
                    console.error("Error saving user data:", error);
                    showNotification("Failed to save user data.", "error");
                });
            }).catch((error) => {
                console.error("Error updating profile:", error);
                showNotification("Failed to update profile.", "error");
            });
        })
        .catch((error) => {
            console.error("Error during registration:", error);
            const friendlyMessage = getFriendlyErrorMessage(error.code);
            showNotification(friendlyMessage, "error");
        });
}

// Attach the registerUser function to the form submission
document.getElementById("registerForm").addEventListener("submit", (e) => {
    e.preventDefault(); // Prevents default form submission
    registerUser();
});
