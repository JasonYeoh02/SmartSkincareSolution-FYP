import { db, auth } from './firebase-config.js';
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const orderSummary = JSON.parse(localStorage.getItem('orderSummary'));

            // Check if orderSummary exists
            if (!orderSummary || !orderSummary.subtotal) {
                alert('No items found in the order summary.');
                console.error('Order Summary:', orderSummary); // Debugging log
                window.location.href = '/html/cart.html'; // Redirect to cart if no items
                return;
            }

            // Display Order Summary
            const tax = orderSummary.tax || 0;
            const grandTotal = orderSummary.grandTotal || 0;

            document.getElementById('subtotal').textContent = `RM ${orderSummary.subtotal.toFixed(2)}`;
            document.getElementById('shipping-fee').textContent = `RM ${orderSummary.shippingFee.toFixed(2)}`;
            document.getElementById('tax-amount').textContent = `RM ${tax.toFixed(2)}`;
            document.getElementById('grand-total').textContent = `RM ${grandTotal.toFixed(2)}`;

            // Fetch and display billing details
            try {
                const billingDoc = doc(db, `users/${user.uid}`);
                const billingSnapshot = await getDoc(billingDoc);

                if (billingSnapshot.exists()) {
                    const billingData = billingSnapshot.data().billingCard;

                    document.getElementById('card-holder-name').value = billingData.cardHolderName || '';
                    document.getElementById('card-number').value = `**** **** **** ${billingData.cardNumber.slice(-4)}`;
                    document.getElementById('expiry-date').value = billingData.expiry || '';
                    document.getElementById('cvv').value = `*${billingData.cvv.slice(-1)}`;
                } else {
                    alert('Billing details not found.');
                }
            } catch (error) {
                console.error('Error fetching billing details:', error);
            }
        } else {
            alert('User not logged in. Redirecting to login.');
            window.location.href = '/html/login.html';
        }
    });
});

// Back to cart button
document.getElementById('back-to-cart').addEventListener('click', () => {
    window.location.href = '/html/cart.html';
});

const modal = document.getElementById('confirmation-modal');
const payNowButton = document.getElementById('pay-now-button');
const cancelPaymentButton = document.getElementById('cancel-payment');
const confirmPaymentButton = document.getElementById('confirm-payment');

// Show modal when "Pay Now" is clicked
payNowButton.addEventListener('click', (e) => {
    e.preventDefault(); // Prevent form submission
    modal.style.display = 'flex'; // Show modal
});

// Close modal when "Cancel" is clicked
cancelPaymentButton.addEventListener('click', () => {
    modal.style.display = 'none'; // Hide modal
});

// Clear the cart from Firestore
async function clearCart(userId) {
    try {
        const cartCollection = collection(db, `users/${userId}/cart`);
        const cartSnapshot = await getDocs(cartCollection);

        const deletePromises = cartSnapshot.docs.map((doc) => deleteDoc(doc.ref));
        await Promise.all(deletePromises);

        console.log('Cart cleared successfully.');
    } catch (error) {
        console.error('Error clearing the cart:', error);
    }
}

// Confirm payment
confirmPaymentButton.addEventListener('click', async () => {
    try {
        const user = auth.currentUser;
        if (!user) {
            alert('User not logged in.');
            window.location.href = '/html/login.html';
            return;
        }

        const orderSummary = JSON.parse(localStorage.getItem('orderSummary'));

        // Validate orderSummary exists
        if (!orderSummary || !orderSummary.subtotal) {
            alert('No order details found. Redirecting to cart.');
            window.location.href = '/html/cart.html';
            return;
        }

        // Generate order ID and payment date
        const orderId = `ORD${Date.now()}`;
        const paymentDate = new Date().toISOString();

        // Prepare order data
        const orderData = {
            orderId,
            paymentDate,
            totalAmount: orderSummary.grandTotal,
            items: orderSummary.items || [], // Ensure items exist
            userId: user.uid,
            subtotal: orderSummary.subtotal,
            tax: orderSummary.tax,
            shippingFee: orderSummary.shippingFee,
            orderStatus: 'Paid',
        };

        // Save order to Firebase
        await setDoc(doc(db, 'orders', orderId), orderData);

        // Clear the cart after successful order creation
        await clearCart(user.uid);

        // Save Order ID for the confirmation page
        localStorage.setItem('currentOrderId', orderId);

        // Redirect to confirmation page
        window.location.href = '/html/order-confirmation.html';
    } catch (error) {
        console.error('Error processing payment:', error);
        alert('Failed to process the payment. Please try again.');
    }
});
