import { db, auth } from './firebase-config.js';
import { collection, query, where, getDocs, doc, setDoc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';

const placeholderImageURL = "/img/placeholder.jpg";
let selectedProduct = null;

// Analyze skin and display recommendations
async function analyzeSkin() {
    const fileInput = document.getElementById("imageUpload");
    const resultDiv = document.getElementById("result");
    const productGrid = document.getElementById("product-grid");

    productGrid.innerHTML = "";
    resultDiv.innerHTML = "";

    if (fileInput.files.length === 0) {
        resultDiv.innerHTML = "<p style='color: red;'>Please upload an image.</p>";
        return;
    }

    resultDiv.innerHTML = "Processing your image...";
    try {
        const formData = new FormData();
        formData.append("image", fileInput.files[0]);

        const response = await fetch("http://127.0.0.1:5000/analyze", { method: "POST", body: formData });
        if (response.ok) {
            const data = await response.json();
            resultDiv.innerHTML = `Analysis Complete: ${data.condition} Detected`;

            if (data.condition === "Acne") {
                await loadAcneProducts();
            } else {
                productGrid.innerHTML = "<p>No recommendations for this condition.</p>";
            }
        } else {
            resultDiv.innerHTML = "Error analyzing the image.";
        }
    } catch (error) {
        resultDiv.innerHTML = "Error connecting to the server.";
    }
}

// Load acne-related products
async function loadAcneProducts() {
    const productsCollection = collection(db, 'products');
    const acneQuery = query(productsCollection, where("category", "==", "acne"));
    const productSnapshot = await getDocs(acneQuery);
    const productGrid = document.getElementById("product-grid");

    productSnapshot.forEach(doc => {
        const productData = doc.data();
        const productElement = createProductElement(doc.id, productData);
        productGrid.appendChild(productElement);
    });
}

// Helper function to create product elements
function createProductElement(productId, product) {
    const productDiv = document.createElement('div');
    productDiv.className = 'product-card';
    const imageURL = product.imageURL || placeholderImageURL;

    productDiv.innerHTML = `
        <img src="${imageURL}" alt="${product.name}">
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <p class="price">RM ${product.price.toFixed(2)}</p>
        <button onclick="showQuantityModal('${productId}', '${product.name}', ${product.price})">Add to Cart</button>
    `;
    return productDiv;
}

// Modal and Add to Cart functionality
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
    let quantity = Math.max(1, parseInt(quantityInput.value || 1) + change);
    quantityInput.value = quantity;
}

async function confirmAddToCart() {
    const quantity = parseInt(document.getElementById("modal-quantity").value);
    const { productId, productName, productPrice } = selectedProduct;

    const user = auth.currentUser;
    if (!user) {
        showToast("Please log in to add items to your cart.");
        closeModal();
        return;
    }

    const cartItemRef = doc(db, `users/${user.uid}/cart/${productId}`);
    try {
        const cartItemDoc = await getDoc(cartItemRef);
        if (cartItemDoc.exists()) {
            await updateDoc(cartItemRef, { quantity: cartItemDoc.data().quantity + quantity });
        } else {
            await setDoc(cartItemRef, { productId, productName, productPrice, quantity });
        }
        showToast("Item added to cart!");
        closeModal();
    } catch (error) {
        console.error("Error adding to cart:", error);
    }
}

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = "toast show";
    setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
}

window.analyzeSkin = analyzeSkin;
window.showQuantityModal = showQuantityModal;
window.closeModal = closeModal;
window.changeQuantity = changeQuantity;
window.confirmAddToCart = confirmAddToCart;

// Function to display user info
async function displayUserInfo(user) {
    const userInfoElement = document.getElementById("user-info");

    if (user) {
        try {
            console.log("Fetching user data for UID:", user.uid);
            const userRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(userRef);

            if (docSnap.exists()) {
                const userData = docSnap.data();
                console.log("User data found:", userData);
                userInfoElement.innerText = `Welcome, ${userData.username}`;
            } else {
                console.warn("No user data found for this UID");
                userInfoElement.innerText = "User data not found.";
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
            userInfoElement.innerText = "Error loading user data.";
        }
    } else {
        userInfoElement.innerText = "User not logged in.";
    }
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        displayUserInfo(user);
    } else {
        window.location.href = "/html/login.html";
    }
});
