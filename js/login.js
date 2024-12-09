// Import Firebase Authentication and Firestore services
import { auth, db } from "./firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getDocs, collection, query, where } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Hardcoded admin credentials
const adminCredentials = {
    username: "admin@gmail.com",
    password: "admin123!"
};

// Function to show error messages
function showError(message) {
    const errorMessage = document.getElementById("error-message");
    errorMessage.innerText = message;
    errorMessage.style.display = "block"; // Show the error message
}

// Function to check user's membership status in Firestore
async function checkMembershipStatus(email) {
    try {
        // Query Firestore for the user by email
        const usersCollection = collection(db, "users");
        const q = query(usersCollection, where("email", "==", email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data(); // Get the first matching document
            return userData.membershipStatus; // Return the user's membership status
        } else {
            return null; // No user found
        }
    } catch (error) {
        console.error("Error checking membership status:", error);
        return null; // Handle Firestore errors gracefully
    }
}

// Function to log in the user
async function loginUser() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    // Hide previous error message
    document.getElementById("error-message").style.display = "none";

    // Check if email and password fields are filled
    if (!email || !password) {
        showError("Please enter both email and password.");
        return;
    }

    // Check for admin credentials
    if (email === adminCredentials.username && password === adminCredentials.password) {
        // Redirect to admin dashboard
        window.location.href = "/html/admin/admin-dashboard.html";
        return;
    }

    // Attempt to check user's membership status before logging in
    const membershipStatus = await checkMembershipStatus(email);

    if (membershipStatus === "Inactive") {
        showError("Your account is inactive. Please contact support (+04 456 7890 / info@smartskincare.com).");
        return;
    } else if (membershipStatus === null) {
        showError("No account found with this email.");
        return;
    }

    // Attempt to log in the user with Firebase for active users
    signInWithEmailAndPassword(auth, email, password)
        .then(() => {
            // Redirect on successful login
            window.location.href = "/html/home.html";
        })
        .catch((error) => {
            // Handle specific error messages based on Firebase error codes
            if (error.code === "auth/user-not-found") {
                showError("No account found with this email.");
            } else if (error.code === "auth/wrong-password") {
                showError("Incorrect password. Please try again.");
            } else if (error.code === "auth/invalid-email") {
                showError("Please enter a valid email address.");
            } else {
                showError("Invalid email or password. Please try again.");
            }
        });
}

// Attach the loginUser function to the form submission
document.getElementById("loginForm").addEventListener("submit", (e) => {
    e.preventDefault(); // Prevent default form submission
    loginUser();
});
