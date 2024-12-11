import { db } from './firebase-config.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', async () => {
    const orderIdElement = document.getElementById('order-id');
    const totalPaidElement = document.getElementById('total-paid');
    const orderDetailsContainer = document.getElementById('order-details');

    const orderId = localStorage.getItem('currentOrderId');

    if (!orderId) {
        alert('No order details found. Redirecting to homepage.');
        window.location.href = '/html/home.html';
        return;
    }

    try {
        const orderDoc = doc(db, 'orders', orderId);
        const orderSnapshot = await getDoc(orderDoc);

        if (orderSnapshot.exists()) {
            const orderData = orderSnapshot.data();

            orderIdElement.textContent = orderData.orderId;
            totalPaidElement.textContent = `RM ${orderData.totalAmount.toFixed(2)}`;
            orderDetailsContainer.innerHTML = orderData.items
                .map(
                    (item) =>
                        `<p>${item.productName} x${item.quantity} - RM${item.price.toFixed(
                            2
                        )}</p>`
                )
                .join('');
        } else {
            alert('Order details not found.');
            window.location.href = '/html/home.html';
        }
    } catch (error) {
        console.error('Error fetching order details:', error);
        alert('Failed to load order details.');
        window.location.href = '/html/home.html';
    }

    // Back to homepage
    document.getElementById('back-to-homepage').addEventListener('click', () => {
        window.location.href = '/html/home.html'; // Change the path if needed
    });    
});
