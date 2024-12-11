// Import Firestore and Auth from your Firebase configuration
import { db, auth } from './firebase-config.js';
import { collection, getDocs, doc, updateDoc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';

const placeholderImageURL = "/img/placeholder.jpg";  // Ensure this path points to a valid placeholder image in your project
let selectedProduct = null;  // Variable to store the selected product data

// Fetch and display products from Firestore
async function loadProducts() {
    try {
        const productsCollection = collection(db, 'products');
        const productSnapshot = await getDocs(productsCollection);
        const productGrid = document.getElementById('product-grid');
        
        productGrid.innerHTML = '';  // Clear any existing products

        productSnapshot.forEach(doc => {
            const productData = doc.data();
            const productElement = createProductElement(doc.id, productData);  // Pass doc ID as well
            productGrid.appendChild(productElement);
        });
    } catch (error) {
        console.error("Error loading products:", error);
    }
}

// Helper function to create a product HTML element
function createProductElement(productId, product) {
    const productDiv = document.createElement('div');
    productDiv.className = 'product product-card';
    productDiv.setAttribute('data-category', product.category);

    const imageURL = product.imageURL || placeholderImageURL;

    productDiv.innerHTML = `
        <img src="${imageURL}" alt="${product.name}">
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <p class="price">RM ${product.price.toFixed(2)}</p>
        <button class="button-30" role="button" onclick="showQuantityModal('${productId}', '${product.name}', ${product.price})">Add to Cart</button>
    `;

    return productDiv;
}

// Show the quantity modal and set the selected product details
function showQuantityModal(productId, productName, productPrice) {
    selectedProduct = { productId, productName, productPrice };

    // Check if modal elements exist before setting their values
    const modalQuantity = document.getElementById("modal-quantity");
    const modalProductName = document.getElementById("modal-product-name");
    const quantityModal = document.getElementById("quantity-modal");

    if (!modalQuantity || !modalProductName || !quantityModal) {
        console.error("Modal elements are missing in the HTML structure.");
        return;
    }

    modalProductName.textContent = productName;
    modalQuantity.value = 1;  // Reset quantity to 1
    quantityModal.style.display = "flex";
}

// Close the modal
function closeModal() {
    document.getElementById("quantity-modal").style.display = "none";
}

// Handle quantity change
function changeQuantity(change) {
    const quantityInput = document.getElementById("modal-quantity");
    let quantity = parseInt(quantityInput.value) || 1;
    quantity = Math.max(1, quantity + change);  // Prevent quantity from going below 1
    quantityInput.value = quantity;
}

// Show toast notification
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.innerText = message;
    toast.className = 'toast show';
    setTimeout(() => {
        toast.className = toast.className.replace('show', '');
    }, 3000); // Toast duration in milliseconds
}

// Confirm and add the product with the specified quantity to the cart
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

// Search Functionality
function searchProducts() {
    const searchBar = document.getElementById('search-bar');
    const filter = searchBar.value.toLowerCase();
    const products = document.querySelectorAll('.product');

    products.forEach(product => {
        const productName = product.querySelector('h3').innerText.toLowerCase();
        product.style.display = productName.includes(filter) ? '' : 'none';
    });
}

// Filter Functionality
function filterProducts() {
    const filterCategory = document.getElementById('filter-category').value;
    const products = document.querySelectorAll('.product');

    products.forEach(product => {
        const category = product.getAttribute('data-category');
        product.style.display = (filterCategory === 'all' || category === filterCategory) ? '' : 'none';
    });
}

// Monitor authentication state
onAuthStateChanged(auth, user => {
    if (!user) {
        console.log("User is not logged in.");
    } else {
        console.log("User is logged in:", user.email);
    }
});

// Initialize page by loading products
window.addEventListener('DOMContentLoaded', loadProducts);

// Attach functions to the global window object for event listeners
window.searchProducts = searchProducts;
window.filterProducts = filterProducts;
window.showQuantityModal = showQuantityModal;
window.confirmAddToCart = confirmAddToCart;
window.closeModal = closeModal;
window.changeQuantity = changeQuantity;
window.showToast = showToast;
