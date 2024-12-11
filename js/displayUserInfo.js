// Import necessary Firebase services
import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Initialize Firestore
const db = getFirestore();

// Function to display user info
async function displayUserInfo() {
    const userInfoElement = document.getElementById("user-info");

    if (userInfoElement) {
        userInfoElement.innerText = "Loading..."; // Set initial text to "Loading..."
        userInfoElement.style.display = "inline"; // Ensure it is visible

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const userRef = doc(db, 'users', user.uid);
                    const docSnap = await getDoc(userRef);

                    if (docSnap.exists()) {
                        const userData = docSnap.data();
                        userInfoElement.innerText = `Welcome, ${userData.username}`;
                    } else {
                        userInfoElement.innerText = "Welcome, User";
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                    userInfoElement.innerText = "Error loading user data.";
                }
            } else {
                userInfoElement.innerText = "User not logged in.";
            }
        });
    }
}

// Export the function to be used in other files
export { displayUserInfo };
