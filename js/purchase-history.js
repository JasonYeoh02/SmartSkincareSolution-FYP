import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

let selectedProduct = null; // Store selected product for modal

async function fetchAndRenderOrders(user) {
    const tableBody = document.getElementById("history-table-body");

    if (!tableBody) {
        console.error("Table body element not found!");
        return;
    }

    try {
        const ordersQuery = query(collection(db, "orders"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(ordersQuery);

        if (querySnapshot.empty) {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center;">No orders found.</td></tr>`;
            return;
        }

        const purchasedProducts = [];

        querySnapshot.forEach((doc) => {
            const order = doc.data();
            const row = document.createElement("tr");
            row.innerHTML = `
                <td><a href="#" class="order-id-link" data-order-id="${order.orderId}">${order.orderId}</a></td>
                <td>${new Date(order.paymentDate).toLocaleString()}</td>
                <td>${order.orderStatus}</td>
                <td>RM ${order.totalAmount.toFixed(2)}</td>
            `;
            tableBody.appendChild(row);
            order.items.forEach((item) => purchasedProducts.push(item.productId));
        });

        if (purchasedProducts.length > 0) {
            fetchAndRenderRecommendations(purchasedProducts);
        }

        // Attach click event to each order ID link for showing order details
        const orderLinks = document.querySelectorAll(".order-id-link");
        orderLinks.forEach((link) => {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                const orderId = e.target.dataset.orderId;
                showOrderDetails(orderId);
            });
        });
    } catch (error) {
        console.error("Error fetching orders:", error);
    }
}

async function fetchAndRenderRecommendations(purchasedProducts) {
    const recommendationsContainer = document.getElementById("recommendations-grid");
    if (!recommendationsContainer) {
        console.error("Recommendations container not found!");
        return;
    }

    try {
        const response = await fetch("http://127.0.0.1:5000/recommend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ purchasedProducts }),
        });

        if (response.ok) {
            const recommendedProducts = await response.json();
            recommendationsContainer.innerHTML = "";
            recommendedProducts.slice(0, 4).forEach((product) => {
                recommendationsContainer.appendChild(createProductCard(product));
            });
        } else {
            console.error("Failed to fetch recommendations:", response.statusText);
        }
    } catch (error) {
        console.error("Error fetching recommendations:", error);
    }
}

function createProductCard(product) {
    const productCard = document.createElement("div");
    productCard.className = "product-card";
    productCard.innerHTML = `
        <img src="${product["Image URL"]}" alt="${product.Name}">
        <h3>${product.Name}</h3>
        <p>${product.Description}</p>
        <p class="price">RM ${product["Price (RM)"].toFixed(2)}</p>
        <button class="add-to-cart-btn" onclick="showQuantityModal('${product.ID}', '${product.Name}', ${product["Price (RM)"]})">Add to Cart</button>
    `;
    return productCard;
}

function showQuantityModal(productId, productName, productPrice) {
    selectedProduct = { productId, productName, productPrice };
    document.getElementById("modal-product-name").textContent = productName;
    document.getElementById("modal-quantity").value = 1;
    document.getElementById("quantity-modal").style.display = "flex";
}

function closeModal() {
    document.getElementById("quantity-modal").style.display = "none";
}

function changeQuantity(change) {
    const quantityInput = document.getElementById("modal-quantity");
    let quantity = parseInt(quantityInput.value) || 1;
    quantity = Math.max(1, quantity + change);
    quantityInput.value = quantity;
}

async function confirmAddToCart() {
    const quantity = parseInt(document.getElementById("modal-quantity").value);
    if (isNaN(quantity) || quantity < 1) {
        showToast("Please enter a valid quantity.");
        return;
    }

    const user = auth.currentUser;
    if (!user) {
        showToast("Please log in to add items to your cart.");
        closeModal();
        return;
    }

    const { productId, productName, productPrice } = selectedProduct;
    const cartItemRef = doc(db, `users/${user.uid}/cart/${productId}`);

    try {
        const cartItemDoc = await getDoc(cartItemRef);

        if (cartItemDoc.exists()) {
            const existingData = cartItemDoc.data();
            await updateDoc(cartItemRef, {
                quantity: existingData.quantity + quantity
            });
        } else {
            await setDoc(cartItemRef, {
                productId,
                productName,
                productPrice,
                quantity
            });
        }

        showToast("Item added to cart successfully!");
        closeModal();
    } catch (error) {
        console.error("Error adding to cart:", error);
        showToast("Failed to add item to cart. Please try again.");
    }
}

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.innerText = message;
    toast.className = "toast show";

    setTimeout(() => {
        toast.className = toast.className.replace("show", "");
    }, 3000); // 3 seconds duration
}

async function showOrderDetails(orderId) {
    const modal = document.getElementById("order-details-modal");
    const modalContent = document.querySelector(".modal-body");

    try {
        const orderDoc = await getDoc(doc(db, "orders", orderId));
        if (orderDoc.exists()) {
            const order = orderDoc.data();

            modalContent.innerHTML = `
                <p><strong>Order ID:</strong> ${order.orderId}</p>
                <p><strong>Status:</strong> ${order.orderStatus}</p>
                <p><strong>Items:</strong></p>
                <ul>
                    ${order.items
                        .map(
                            (item) =>
                                `<li>${item.productName} (x${item.quantity}) - RM ${item.price.toFixed(2)}</li>`
                        )
                        .join("")}
                </ul>
                <p><strong>Total:</strong> RM ${order.totalAmount.toFixed(2)}</p>
            `;

            modal.style.display = "block"; // Show modal
        } else {
            alert("Order details not found.");
        }
    } catch (error) {
        console.error("Error fetching order details:", error);
        alert("Error fetching order details.");
    }
}

function closeOrderDetailsModal() {
    const modal = document.getElementById("order-details-modal");
    modal.style.display = "none";
}

document.getElementById("close-modal").addEventListener("click", closeOrderDetailsModal);
document.getElementById("close-modal-button").addEventListener("click", closeOrderDetailsModal);

onAuthStateChanged(auth, (user) => {
    if (user) {
        fetchAndRenderOrders(user);
    } else {
        window.location.href = "/html/login.html";
    }
});

window.showQuantityModal = showQuantityModal;
window.closeModal = closeModal;
window.changeQuantity = changeQuantity;
window.confirmAddToCart = confirmAddToCart;
window.showToast = showToast;
window.showOrderDetails = showOrderDetails;
window.closeOrderDetailsModal = closeOrderDetailsModal;
