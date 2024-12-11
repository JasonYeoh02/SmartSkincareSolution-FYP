// Import Firestore and Firebase Authentication
import { db, auth } from "./firebase-config.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// Select DOM elements
const dateInput = document.getElementById("appointment-date");
const timeSlotsContainer = document.getElementById("time-slots-container");
const confirmationModal = document.getElementById("confirmation-modal");
const modalDate = document.getElementById("modal-date");
const modalTime = document.getElementById("modal-time");
const confirmBtn = document.getElementById("confirm-btn");
const cancelBtn = document.getElementById("cancel-btn");
const successMessage = document.getElementById("success-message");
const successDate = document.getElementById("success-date");
const successTime = document.getElementById("success-time");

// Variables to hold selected date and time
let selectedDate = "";
let selectedTime = "";
let currentUser = null;

// Monitor authentication state and capture current user
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        console.log("Logged in user:", user.displayName || user.email || user.uid);
    } else {
        console.error("No user is logged in. Redirecting to login page...");
        window.location.href = "/html/login.html";
    }
});

// Fetch available slots for a given date
async function fetchAvailableSlots(date) {
    const dateRef = doc(db, "availability", date);
    const docSnap = await getDoc(dateRef);

    if (docSnap.exists()) {
        console.log("Available slots fetched:", docSnap.data().slots);
        return docSnap.data().slots;
    } else {
        console.log("No availability found for this date.");
        return [];
    }
}

// Load time slots into the DOM
function loadTimeSlots(slots) {
    timeSlotsContainer.innerHTML = "";
    slots.forEach(slot => {
        const button = document.createElement("button");
        button.className = "time-slot";
        button.textContent = slot.time;
        button.disabled = !slot.available;

        if (!slot.available) {
            button.classList.add("disabled");
        } else {
            button.addEventListener("click", () => showConfirmationModal(slot.time));
        }

        timeSlotsContainer.appendChild(button);
    });
}

// Show the confirmation modal
function showConfirmationModal(time) {
    selectedDate = dateInput.value;
    selectedTime = time;

    modalDate.textContent = selectedDate;
    modalTime.textContent = selectedTime;

    confirmationModal.classList.remove("hidden");
}

// Hide the confirmation modal
function hideConfirmationModal() {
    confirmationModal.classList.add("hidden");
}

// Confirm the booking
async function confirmBooking() {
    if (!currentUser) {
        alert("No user logged in. Please log in to book an appointment.");
        return;
    }

    const bookingRef = doc(db, "appointments", `${selectedDate}_${selectedTime}`);
    const userRef = doc(db, "users", currentUser.uid);

    try {
        // Fetch user details from the "users" collection
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            console.error("User details not found in Firestore.");
            alert("User details could not be retrieved. Please try again.");
            return;
        }

        const userData = userSnap.data();

        // Save booking with user details
        await setDoc(bookingRef, {
            date: selectedDate,
            time: selectedTime,
            status: "confirmed",
            user: {
                uid: currentUser.uid,
                name: userData.username || "Anonymous",
                email: userData.email || "No email provided",
                contact: userData.contact || "No contact provided",
            },
        });

        console.log(`Appointment booked for ${selectedDate} at ${selectedTime} by user ${currentUser.uid}`);

        // Update and show the success message
        successDate.textContent = selectedDate;
        successTime.textContent = selectedTime;
        successMessage.classList.remove("hidden");
        console.log("Success message displayed.");

        // Hide the confirmation modal
        hideConfirmationModal();

        // Automatically hide the success message after 5 seconds
        setTimeout(() => {
            successMessage.classList.add("hidden");
            console.log("Success message hidden.");
        }, 7000);
    } catch (error) {
        console.error("Error booking appointment:", error);
        alert("Failed to book the appointment. Please try again.");
    }
}

// Event listener for date picker
dateInput.addEventListener("change", async () => {
    const selectedDate = dateInput.value;
    const today = new Date();
    const selected = new Date(selectedDate);

    // Ensure the selected date is tomorrow or later
    if (selected > today) {
        const slots = await fetchAvailableSlots(selectedDate);
        loadTimeSlots(slots);
    } else {
        alert("Please select a date from tomorrow onward.");
    }
});

// Event listeners for modal buttons
confirmBtn.addEventListener("click", confirmBooking);
cancelBtn.addEventListener("click", hideConfirmationModal);

// Set the minimum selectable date as tomorrow
function setMinDate() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const minDate = tomorrow.toISOString().split("T")[0];
    dateInput.setAttribute("min", minDate);
}

// Call the function when the page loads
setMinDate();
