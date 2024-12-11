import { db, auth } from "../firebase-config.js";
import {
    collection,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

let users = [];
let deleteUserId = null;

// Fetch Users
async function fetchUsers() {
    const usersCollection = collection(db, "users");
    const snapshot = await getDocs(usersCollection);

    users = [];
    snapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
    });

    updateStats();
    displayUsers(users);
}

// Display Users in Table
function displayUsers(usersList) {
    const tableBody = document.getElementById("users-table-body");
    tableBody.innerHTML = "";

    usersList.forEach((user) => {
        const row = `
            <tr>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.contact || "N/A"}</td>
                <td>${user.country || "N/A"}</td>
                <td>
                    <select onchange="confirmMembershipStatusChange('${user.id}', this.value)">
                        <option value="Active" ${user.membershipStatus === "Active" ? "selected" : ""}>Active</option>
                        <option value="Inactive" ${user.membershipStatus === "Inactive" ? "selected" : ""}>Inactive</option>
                    </select>
                </td>
                <td>
                    <button class="view-btn" onclick="viewUser('${user.id}')">View</button>
                    <button class="delete-btn" onclick="openDeleteModal('${user.id}')">Delete</button>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });

    toggleNoResults(usersList.length === 0);
}

let selectedUserId = null;
let selectedNewStatus = null;

// Confirm Membership Status Change with Modal
function confirmMembershipStatusChange(userId, newStatus) {
    selectedUserId = userId;
    selectedNewStatus = newStatus;

    // Populate modal with new status
    document.getElementById("new-status-display").textContent = newStatus;

    // Show the modal
    document.getElementById("status-modal").style.display = "flex";
}

// Confirm the change
async function applyMembershipStatusChange() {
    if (selectedUserId && selectedNewStatus) {
        const userRef = doc(db, "users", selectedUserId);
        await updateDoc(userRef, { membershipStatus: selectedNewStatus });
        fetchUsers();
    }
    closeStatusModal();
}

// Close the modal without applying changes
function closeStatusModal() {
    selectedUserId = null;
    selectedNewStatus = null;
    document.getElementById("status-modal").style.display = "none";
}

// Add event listeners for modal buttons
document.getElementById("confirm-status-btn").addEventListener("click", applyMembershipStatusChange);
document.getElementById("cancel-status-btn").addEventListener("click", closeStatusModal);

// Expose functions globally
window.confirmMembershipStatusChange = confirmMembershipStatusChange;

// View User Functionality (Read-Only Modal)
function viewUser(userId) {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    // Populate modal with shipping details
    document.getElementById("username-display").textContent = user.username || "N/A";
    document.getElementById("email-display").textContent = user.email || "N/A";
    document.getElementById("contact-display").textContent = user.contact || "N/A";
    document.getElementById("address-display").textContent = user.address || "N/A";
    document.getElementById("city-display").textContent = user.city || "N/A";
    document.getElementById("postal-display").textContent = user.postalCode || "N/A";
    document.getElementById("country-display").textContent = user.country || "N/A";

    document.getElementById("view-modal").style.display = "flex";
}

// Close Modal
function closeModal() {
    document.getElementById("view-modal").style.display = "none";
}

// Open Delete Modal
function openDeleteModal(userId) {
    deleteUserId = userId;
    document.getElementById("delete-modal").style.display = "flex";
}

// Close Delete Modal
function closeDeleteModal() {
    deleteUserId = null;
    document.getElementById("delete-modal").style.display = "none";
}

// Delete User
async function confirmDelete() {
    if (deleteUserId) {
        await deleteDoc(doc(db, "users", deleteUserId));
        closeDeleteModal();
        fetchUsers();
    }
}

// Filter Users
function filterUsers() {
    const searchValue = document.getElementById("search-bar").value.toLowerCase();
    const membershipFilter = document.getElementById("membership-filter").value;

    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            !searchValue ||
            user.username.toLowerCase().includes(searchValue) ||
            user.email.toLowerCase().includes(searchValue);
        const matchesMembership = !membershipFilter || user.membershipStatus === membershipFilter;

        return matchesSearch && matchesMembership;
    });

    displayUsers(filteredUsers);
}

// Update Stats
function updateStats() {
    const totalUsers = users.length;
    const activeUsers = users.filter((u) => u.membershipStatus === "Active").length;
    const inactiveUsers = totalUsers - activeUsers;

    document.getElementById("stats").innerHTML = `
        Total Users: ${totalUsers} | Active: ${activeUsers} | Inactive: ${inactiveUsers}
    `;
}

// Utility Functions
function toggleNoResults(show) {
    const noResultsMessage = document.getElementById("no-results-message");
    noResultsMessage.style.display = show ? "block" : "none";
}

// Event Listeners
document.getElementById("apply-filters").addEventListener("click", filterUsers);
document.getElementById("close-modal-btn").addEventListener("click", closeModal);
document.getElementById("cancel-delete-btn").addEventListener("click", closeDeleteModal);
document.getElementById("confirm-delete-btn").addEventListener("click", confirmDelete);

// Fetch Users on Load
fetchUsers();

// Expose Functions Globally
window.viewUser = viewUser;
window.openDeleteModal = openDeleteModal;
window.confirmMembershipStatusChange = confirmMembershipStatusChange;

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