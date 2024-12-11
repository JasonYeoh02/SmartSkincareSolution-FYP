import { db, auth } from './firebase-config.js';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';

let cartItems = []; // Array to store cart items

// Load cart data from Firestore
async function loadCart() {
    try {
        const user = auth.currentUser;
        if (!user) {
            alert("Please log in to view your cart.");
            return;
        }

        const cartCollection = collection(db, `users/${user.uid}/cart`);
        const cartSnapshot = await getDocs(cartCollection);
        cartItems = cartSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderCart();
    } catch (error) {
        console.error("Error loading cart data:", error);
    }
}

// Render the cart items on the page
function renderCart() {
    const cartList = document.getElementById('cart-item-list');
    if (!cartList) {
        console.error('Cart item list element not found.');
        return;
    }

    cartList.innerHTML = ''; // Clear previous items

    if (cartItems.length === 0) {
        document.getElementById('subtotal').textContent = 'RM 0.00';
        document.getElementById('tax').textContent = 'RM 0.00';
        document.getElementById('grand-total').textContent = 'RM 0.00';
        document.getElementById('checkout-button').disabled = true;
        return; // Stop rendering if no items exist
    }

    let subtotal = 0;

    cartItems.forEach(item => {
        const itemTotal = item.productPrice * item.quantity;
        subtotal += itemTotal;

        // Create a table row for each item
        const row = document.createElement('tr');
        row.classList.add('cart-item');

        row.innerHTML = `
            <td>
                <img src="${item.productImage || '/img/placeholder.jpg'}" alt="${item.productName}" class="cart-item-image">
                <div class="cart-item-details">
                    <p class="cart-item-name">${item.productName}</p>
                </div>
            </td>
            <td>RM ${item.productPrice.toFixed(2)}</td>
            <td>
                <div class="cart-item-controls">
                    <button onclick="updateQuantity('${item.id}', -1)">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="updateQuantity('${item.id}', 1)">+</button>
                    <button onclick="removeItem('${item.id}')" class="remove-button">Remove</button>
                </div>
            </td>
            <td>RM ${itemTotal.toFixed(2)}</td>
        `;

        // Append the row to the table body
        cartList.appendChild(row);
    });

    document.getElementById('subtotal').textContent = `RM ${subtotal.toFixed(2)}`;
    const tax = subtotal * 0.06; // Assume 6% tax
    const grandTotal = subtotal + tax;
    document.getElementById('tax').textContent = `RM ${tax.toFixed(2)}`;
    document.getElementById('grand-total').textContent = `RM ${grandTotal.toFixed(2)}`;
    document.getElementById('checkout-button').disabled = cartItems.length === 0;
}

// Update quantity of cart items
async function updateQuantity(itemId, change) {
    try {
        const item = cartItems.find(i => i.id === itemId);
        if (!item) return;

        const newQuantity = item.quantity + change;
        if (newQuantity < 1) return; // Quantity can't be less than 1

        item.quantity = newQuantity;
        await updateDoc(doc(db, `users/${auth.currentUser.uid}/cart`, itemId), { quantity: newQuantity });
        renderCart();
    } catch (error) {
        console.error('Error updating quantity:', error);
    }
}

// Remove item from cart
async function removeItem(itemId) {
    try {
        await deleteDoc(doc(db, `users/${auth.currentUser.uid}/cart`, itemId));
        cartItems = cartItems.filter(item => item.id !== itemId);
        renderCart();
    } catch (error) {
        console.error('Error removing item:', error);
    }
}

// Clear the entire cart after payment
async function clearCart(userId) {
    try {
        const cartCollection = collection(db, `users/${userId}/cart`);
        const cartSnapshot = await getDocs(cartCollection);

        const deletePromises = cartSnapshot.docs.map((doc) => deleteDoc(doc.ref));
        await Promise.all(deletePromises);

        console.log('Cart cleared successfully.');
        cartItems = []; // Reset local cart items
        renderCart(); // Re-render empty cart
    } catch (error) {
        console.error('Error clearing the cart:', error);
    }
}

// Initialize after authentication state is known
onAuthStateChanged(auth, user => {
    if (user) {
        loadCart(); // Load cart only if user is authenticated
    } else {
        alert("Please log in to view your cart.");
    }
});

window.updateQuantity = updateQuantity;
window.removeItem = removeItem;

// Redirect to the Payment Page
function redirectToPayment() {
    try {
        // Fetch order summary details
        const subtotalText = document.getElementById('subtotal').textContent.replace('RM ', '');
        const taxText = document.getElementById('tax').textContent.replace('RM ', '');
        const grandTotalText = document.getElementById('grand-total').textContent.replace('RM ', '');
        const subtotal = parseFloat(subtotalText);
        const tax = parseFloat(taxText);
        const grandTotal = parseFloat(grandTotalText);
        const shippingFee = grandTotal >= 50 ? 0 : 5.90;

        // Include cart items in the order summary
        const orderSummary = {
            subtotal: subtotal || 0,
            tax: tax || 0,
            shippingFee: shippingFee || 0,
            grandTotal: grandTotal + shippingFee || 0,
            items: cartItems.map((item) => ({
                productId: item.id,
                productName: item.productName,
                quantity: item.quantity,
                price: item.productPrice,
            })),
        };

        // Save order summary to localStorage
        console.log('Saving Order Summary:', orderSummary); // Debugging log
        localStorage.setItem('orderSummary', JSON.stringify(orderSummary));

        // Redirect to Payment Page
        window.location.href = '/html/payment.html';
    } catch (error) {
        console.error('Error redirecting to payment:', error);
        alert('An error occurred while proceeding to checkout.');
    }
}

// Attach to global scope
window.redirectToPayment = redirectToPayment;
window.clearCart = clearCart;
