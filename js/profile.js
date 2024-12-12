import { auth } from "./firebase-config.js";
import {
    onAuthStateChanged,
    EmailAuthProvider,
    reauthenticateWithCredential,
    updateEmail
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc,
    updateDoc,
    collection,
    getDocs,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Firestore initialization
const db = getFirestore();

// Show and Hide modal functions
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function hideModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

window.showModal = showModal;
window.hideModal = hideModal;

// Show a toast notification
function showToast(message, isError = false) {
    let toast = document.querySelector('.toast-message');
    if (!toast) {
        toast = document.createElement('div');
        toast.classList.add('toast-message');
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.backgroundColor = isError ? '#f44336' : '#4caf50';

    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Validation functions
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePhoneNumber(phoneNumber) {
    const phoneRegex = /^\d{10,11}$/;
    return phoneRegex.test(phoneNumber);
}

function validateCardNumber(cardNumber) {
    const cardNumberRegex = /^\d{16}$/;
    return cardNumberRegex.test(cardNumber);
}

function validateCVV(cvv) {
    const cvvRegex = /^\d{3,4}$/;
    return cvvRegex.test(cvv);
}

// Mask the card number for display (show only the last 4 digits)
function maskCardNumber(number) {
    return `**** **** **** ${number.slice(-4)}`;
}

// Load user profile data and display user's name in the navigation bar
async function loadUserProfile() {
    const user = auth.currentUser;
    if (!user) {
        console.log("No user is currently logged in.");
        return;
    }

    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
        const data = userDoc.data();

        // Display user data in profile fields
        document.getElementById("username").innerText = data.username || "Not provided";
        document.getElementById("email").innerText = data.email || "Not provided";
        document.getElementById("contact").innerText = data.contact || "Not provided";
        document.getElementById("membership").innerText = data.membershipStatus || "Active";
        document.getElementById("address").innerText = data.address || "Not provided";
        document.getElementById("city").innerText = data.city || "Not provided";
        document.getElementById("postal-code").innerText = data.postalCode || "Not provided";
        document.getElementById("country").innerText = data.country || "Not provided";

        // Display billing card details (masked)
        document.getElementById("billing-card-holder").innerText = data.billingCard?.cardHolderName || "Not provided";
        document.getElementById("billing-card-number").innerText = data.billingCard?.cardNumber
            ? maskCardNumber(data.billingCard.cardNumber)
            : "Not provided";
        document.getElementById("billing-expiry").innerText = data.billingCard?.expiry || "Not provided";

        // Update user's name in the navigation bar
        document.getElementById("user-info").innerText = `Welcome, ${data.username || "User"}`;
    } else {
        console.log("User document does not exist in Firestore.");
    }
}

// Save changes to profile, shipping, or billing sections
async function saveChanges(section) {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const updatedData = {};

    if (section === "profile") {
        const username = document.getElementById("modal-username").value.trim();
        const email = document.getElementById("modal-email").value.trim();
        const contact = document.getElementById("modal-contact").value.trim();

        if (email && !validateEmail(email)) {
            showToast("Invalid email format.", true);
            return;
        }

        if (contact && !validatePhoneNumber(contact)) {
            showToast("Invalid phone number. It should be 10-11 digits.", true);
            return;
        }

        if (username) updatedData.username = username;
        if (contact) updatedData.contact = contact;

        try {
            if (email && email !== user.email) {
                // Update email in Firebase Authentication
                await updateEmail(user, email);
                updatedData.email = email; // Update Firestore email
            }

            await updateDoc(userRef, updatedData);
            showToast(`${section} information saved successfully!`);
            hideModal(`${section}-modal`);
            loadUserProfile(); // Refresh profile data after saving
        } catch (error) {
            console.error("Error updating profile:", error);
            showToast("Failed to save changes. Please try again.", true);
        }
    }

    // Additional logic for shipping and billing can be added here as needed
}

// Attach functions to the global window object
window.saveChanges = saveChanges;
window.showModal = showModal;
window.hideModal = hideModal;

// Monitor auth state and initialize display
onAuthStateChanged(auth, (user) => {
    if (user) {
        loadUserProfile();
    } else {
        window.location.href = "/html/login.html";
    }
});
