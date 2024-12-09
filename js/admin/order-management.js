import { db, auth } from "../firebase-config.js";
import { collection, getDocs, updateDoc, doc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

let orders = [];
let selectedOrder = {};

// Fetch Orders
async function fetchOrders() {
    try {
        const ordersCollection = collection(db, "orders");
        const usersCollection = collection(db, "users");
        const snapshot = await getDocs(ordersCollection);
        const userSnapshot = await getDocs(usersCollection);

        const userMap = {};
        userSnapshot.forEach((doc) => {
            userMap[doc.id] = doc.data().username || "Unknown User";
        });

        orders = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            orders.push({
                id: doc.id,
                ...data,
                username: userMap[data.userId] || "Unknown User",
            });
        });

        displayOrders(orders);
    } catch (error) {
        document.getElementById("error-message").style.display = "block";
    }
}

// Display Orders in Table
function displayOrders(orderList) {
    const tableBody = document.getElementById("orders-table-body");
    tableBody.innerHTML = "";

    orderList.forEach((order) => {
        const row = `
            <tr>
                <td>${order.orderId}</td>
                <td>${new Date(order.paymentDate).toLocaleString()}</td>
                <td>${order.username}</td>
                <td>
                    <select onchange="openStatusModal('${order.id}', '${order.orderStatus}', this.value)">
                        <option value="Paid" ${order.orderStatus === "Paid" ? "selected" : ""}>Paid</option>
                        <option value="Shipped" ${order.orderStatus === "Shipped" ? "selected" : ""}>Shipped</option>
                        <option value="Delivered" ${order.orderStatus === "Delivered" ? "selected" : ""}>Delivered</option>
                        <option value="Cancelled" ${order.orderStatus === "Cancelled" ? "selected" : ""}>Cancelled</option>
                    </select>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

// Open Status Modal
window.openStatusModal = (orderId, currentStatus, newStatus) => {
    selectedOrder = { orderId, currentStatus, newStatus };
    document.getElementById("order-id-display").textContent = orderId;
    document.getElementById("current-status").textContent = currentStatus;
    document.getElementById("new-status").textContent = newStatus;
    document.getElementById("status-modal").style.display = "flex";
};

// Confirm Status Change
document.getElementById("confirm-status-btn").addEventListener("click", async () => {
    try {
        const orderRef = doc(db, "orders", selectedOrder.orderId);
        await updateDoc(orderRef, { orderStatus: selectedOrder.newStatus });
        document.getElementById("status-modal").style.display = "none";
        fetchOrders();
    } catch (error) {
        console.error("Error updating order status:", error);
    }
});

// Cancel Status Change
document.getElementById("cancel-status-btn").addEventListener("click", () => {
    document.getElementById("status-modal").style.display = "none";
    fetchOrders();
});

// Fetch Orders on Load
fetchOrders();

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