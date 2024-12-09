// Import necessary Firebase services
import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Initialize Firestore
const db = getFirestore();

// Function to display user info
async function displayUserInfo(user) {
    const userInfoElement = document.getElementById("user-info");

    if (user) {
        try {
            console.log("Fetching user data for UID:", user.uid); // Debugging
            const userRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(userRef);

            if (docSnap.exists()) {
                const userData = docSnap.data();
                console.log("User data found:", userData); // Debugging
                userInfoElement.innerText = `Welcome, ${userData.username}`;
            } else {
                console.warn("No user data found for this UID"); // Debugging
                userInfoElement.innerText = "User data not found.";
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
            userInfoElement.innerText = "Error loading user data.";
        }
    } else {
        userInfoElement.innerText = "User not logged in.";
    }
}

// Monitor auth state and display user info if logged in
onAuthStateChanged(auth, (user) => {
    if (user) {
        displayUserInfo(user);
    } else {
        window.location.href = "/html/login.html"; // Redirect to login if not authenticated
    }
});

// Logout functionality
const logoutButton = document.getElementById("logout-btn");
if (logoutButton) {
    logoutButton.addEventListener("click", () => {
        signOut(auth).then(() => {
            window.location.href = "/html/login.html"; // Redirect to login after logout
        }).catch((error) => {
            console.error("Logout error:", error);
        });
    });
}
