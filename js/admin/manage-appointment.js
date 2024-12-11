import { db, auth } from "../firebase-config.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  collection,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// DOM Elements
const dateInput = document.getElementById("manage-date");
const availabilityBody = document.getElementById("availability-body");
const appointmentsBody = document.getElementById("appointments-body");
const noAppointmentsMessage = document.getElementById("no-appointments-message");

// Toast Notification
const toastContainer = document.getElementById("toast-container");
const toastMessage = document.getElementById("toast-message");

// Reschedule Modal Elements
const rescheduleModal = document.getElementById("reschedule-modal");
const rescheduleDateInput = document.getElementById("reschedule-date");
const rescheduleTimeSelect = document.getElementById("reschedule-time");
const confirmRescheduleBtn = document.getElementById("confirm-reschedule-btn");
const cancelRescheduleBtn = document.getElementById("cancel-reschedule-btn");

// Variables
let selectedDate = "";
let slots = [];
let appointments = [];
let currentSlotIndex = null;
let currentAppointmentId = null;

// Fetch Availability
async function fetchAvailability(date) {
  const availabilityRef = doc(db, "availability", date);
  const docSnap = await getDoc(availabilityRef);
  return docSnap.exists() ? docSnap.data().slots : [];
}

// Fetch Appointments
async function fetchAppointments(date) {
  const appointmentsRef = collection(db, "appointments");
  const querySnapshot = await getDocs(appointmentsRef);
  return querySnapshot.docs
    .filter((doc) => doc.data().date === date)
    .map((doc) => ({ id: doc.id, ...doc.data() }));
}

// Load Availability
function loadAvailability(slots) {
  availabilityBody.innerHTML = slots
    .map(
      (slot, index) => `
    <tr>
      <td>${slot.time}</td>
      <td class="${slot.available ? "status-available" : "status-unavailable"}">
        ${slot.available ? "Available" : "Unavailable"}
      </td>
      <td>
        <button class="action-btn ${
          slot.available ? "mark-unavailable" : "mark-available"
        }" data-index="${index}">
          ${slot.available ? "Mark Unavailable" : "Mark Available"}
        </button>
      </td>
    </tr>
  `
    )
    .join("");

  // Add Event Listeners for Updating Availability
  document.querySelectorAll(".action-btn").forEach((btn) =>
    btn.addEventListener("click", async (e) => {
      const index = e.target.dataset.index;
      slots[index].available = !slots[index].available;
      await setDoc(doc(db, "availability", selectedDate), { slots });
      loadAvailability(slots);
      showToast(
        `Slot marked as ${
          slots[index].available ? "Available" : "Unavailable"
        } successfully.`
      );
    })
  );
}

// Function to load appointments including the Confirm button
function loadAppointments(appointments) {
  appointmentsBody.innerHTML = appointments.length
    ? appointments
        .map(
          (appointment) => `
    <tr>
      <td>${appointment.user.name}</td>
      <td>${appointment.date}</td>
      <td>${appointment.time}</td>
      <td>${appointment.status}</td>
      <td>
        <button class="action-btn cancel" data-id="${appointment.id}">Cancel</button>
        <button class="action-btn reschedule" data-id="${appointment.id}">Reschedule</button>
        ${
          appointment.status === "cancelled"
            ? `<button class="action-btn confirm" data-id="${appointment.id}">Confirm</button>`
            : ""
        }
      </td>
    </tr>
  `
        )
        .join("")
    : "";

  noAppointmentsMessage.classList.toggle("hidden", appointments.length > 0);

  // Add Event Listeners for Cancel
  document.querySelectorAll(".cancel").forEach((btn) =>
    btn.addEventListener("click", async (e) => {
      const id = e.target.dataset.id;
      await updateDoc(doc(db, "appointments", id), { status: "cancelled" });
      dateInput.dispatchEvent(new Event("change"));
      showToast("Appointment cancelled successfully.");
    })
  );

  // Add Event Listeners for Reschedule
  document.querySelectorAll(".reschedule").forEach((btn) =>
    btn.addEventListener("click", async (e) => {
      currentAppointmentId = e.target.dataset.id;
      rescheduleDateInput.value = selectedDate;
      const availableSlots = await fetchAvailability(selectedDate);
      populateTimeSlots(availableSlots);
      rescheduleModal.classList.remove("hidden");
    })
  );

  // Add Event Listeners for Confirm
  document.querySelectorAll(".confirm").forEach((btn) =>
    btn.addEventListener("click", async (e) => {
      const id = e.target.dataset.id;
      try {
        await updateDoc(doc(db, "appointments", id), { status: "confirmed" });
        dateInput.dispatchEvent(new Event("change"));
        showToast("Appointment confirmed successfully.");
      } catch (error) {
        console.error("Error confirming appointment:", error);
        showToast("Failed to confirm the appointment. Please try again.");
      }
    })
  );
}

// Populate Available Time Slots in Reschedule Modal
function populateTimeSlots(slots) {
  rescheduleTimeSelect.innerHTML = slots
    .filter((slot) => slot.available)
    .map((slot) => `<option value="${slot.time}">${slot.time}</option>`)
    .join("");
}

// Show Toast Notification
function showToast(message) {
  toastMessage.textContent = message;
  toastContainer.classList.add("show");
  setTimeout(() => toastContainer.classList.remove("show"), 3000);
}

// Event Listener for Reschedule Modal Confirm Button
confirmRescheduleBtn.addEventListener("click", async () => {
  const newDate = rescheduleDateInput.value;
  const newTime = rescheduleTimeSelect.value;

  if (!newDate || !newTime) {
    alert("Please select both a new date and time.");
    return;
  }

  try {
    await updateDoc(doc(db, "appointments", currentAppointmentId), {
      date: newDate,
      time: newTime,
    });
    showToast("Appointment rescheduled successfully.");
    rescheduleModal.classList.add("hidden");
    dateInput.dispatchEvent(new Event("change"));
  } catch (error) {
    console.error("Error rescheduling appointment:", error);
    showToast("Error rescheduling appointment. Please try again.");
  }
});

// Event Listener for Reschedule Modal Cancel Button
cancelRescheduleBtn.addEventListener("click", () => {
  rescheduleModal.classList.add("hidden");
  currentAppointmentId = null;
});

// Date Input Change Event
dateInput.addEventListener("change", async () => {
  selectedDate = dateInput.value;
  if (!selectedDate) return alert("Please select a valid date.");

  slots = await fetchAvailability(selectedDate);
  loadAvailability(slots);

  appointments = await fetchAppointments(selectedDate);
  loadAppointments(appointments);
});

// Restrict Date Picker to Today and Beyond
document.addEventListener("DOMContentLoaded", () => {
  const today = new Date().toISOString().split("T")[0];

  // Set the min date for the manage date input
  if (dateInput) {
    dateInput.setAttribute("min", today);
  }

  // Set the min date for the reschedule date input
  if (rescheduleDateInput) {
    rescheduleDateInput.setAttribute("min", today);
  }

  // Set default date
  setDefaultDate();
});

// Set Default Date on Load
function setDefaultDate() {
  const today = new Date().toISOString().split("T")[0];
  dateInput.value = today;
  dateInput.dispatchEvent(new Event("change"));
}

// Logout functionality
document.getElementById("logout-btn").addEventListener("click", () => {
  signOut(auth)
      .then(() => {
          window.location.href = "/html/login.html"; // Redirect to login page
      })
      .catch((error) => {
          console.error("Error logging out:", error);
      });
});