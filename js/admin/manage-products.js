import { db, auth } from "../firebase-config.js";
import {
    collection,
    getDocs,
    setDoc,
    updateDoc,
    doc,
    deleteDoc,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

let deleteProductId = null;
let products = [];

// Centralized Data Arrays
const categories = ["moisturizer", "serum", "anti-aging", "acne"];
const skinTypes = ["Oily", "Dry", "Combination", "Sensitive", "Normal", "All Skin Type"];
const activeIngredients = [
    "Hyaluronic Acid",
    "Salicylic Acid",
    "Retinol",
    "Niacinamide",
    "Vitamin C",
];

// Placeholder image URL
const placeholderImageURL = "https://www.svgrepo.com/show/508699/landscape-placeholder.svg";

// Image validation constants
const MAX_FILE_SIZE_MB = 0.9; // 900 KB
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png"];

// Validate Image File
function validateImageFile(file) {
    const errorElement = document.getElementById("image-error");

    if (!file) {
        errorElement.textContent = "No file selected.";
        errorElement.style.display = "block";
        return false;
    }

    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
        errorElement.textContent = `File size exceeds ${MAX_FILE_SIZE_MB} MB.`;
        errorElement.style.display = "block";
        return false;
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        errorElement.textContent = "Invalid file type. Only JPEG and PNG are allowed.";
        errorElement.style.display = "block";
        return false;
    }

    errorElement.textContent = "";
    errorElement.style.display = "none";
    return true;
}

// Convert image to Base64
function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}

// Fetch Products
async function fetchProducts() {
    const productsCollection = collection(db, "products");
    const snapshot = await getDocs(productsCollection);

    products = [];
    snapshot.forEach((doc) => {
        products.push({ id: doc.id, ...doc.data() });
    });

    products.sort((a, b) => (a.id > b.id ? 1 : -1));
    displayProducts(products);
    populateCategoryFilter();
}

// Display Products
function displayProducts(products) {
    const tableBody = document.getElementById("products-table-body");
    tableBody.innerHTML = "";

    products.forEach((product) => {
        const imageUrl = product.imageURL || placeholderImageURL;
        const row = `
            <tr>
                <td>${product.id}</td>
                <td><img src="${imageUrl}" class="product-image" style="width: 100px; height: 100px;"></td>
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>${product.targetSkinType ? product.targetSkinType.join(", ") : "-"}</td>
                <td>RM ${product.price.toFixed(2)}</td>
                <td>
                    <button class="edit-btn" onclick="editProduct('${product.id}')">Edit</button>
                    <button class="delete-btn" onclick="openDeleteModal('${product.id}')">Delete</button>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });

    const noResultsMessage = document.getElementById("no-results-message");
    noResultsMessage.style.display = products.length === 0 ? "block" : "none";
}

// Open Delete Modal
function openDeleteModal(productId) {
    deleteProductId = productId;
    document.getElementById("delete-modal").style.display = "flex";
}

function closeDeleteModal() {
    deleteProductId = null;
    document.getElementById("delete-modal").style.display = "none";
}

// Confirm Delete
async function confirmDelete() {
    if (deleteProductId) {
        await deleteDoc(doc(db, "products", deleteProductId));
        closeDeleteModal();
        fetchProducts();
    }
}

// Edit Product
function editProduct(productId) {
    const product = products.find((p) => p.id === productId);
    const formElements = {
        productId: document.getElementById("product-id"),
        name: document.getElementById("name"),
        description: document.getElementById("description"),
        price: document.getElementById("price"),
        category: document.getElementById("category-dropdown"),
        skinType: document.getElementById("target-skin-type"),
        ingredients: document.getElementById("active-ingredients"),
    };

    populateCategoryDropdown();
    populateSkinTypeDropdown();
    populateIngredientsDropdown();

    formElements.productId.value = product.id || "";
    formElements.name.value = product.name || "";
    formElements.description.value = product.description || "";
    formElements.price.value = product.price || "";
    formElements.category.value = product.category || "";

    Array.from(formElements.skinType.options).forEach((option) => {
        option.selected = product.targetSkinType?.includes(option.value) || false;
    });
    Array.from(formElements.ingredients.options).forEach((option) => {
        option.selected = product.activeIngredients?.includes(option.value) || false;
    });

    openModal();
}

// Add New Product
function addNewProduct() {
    const form = document.getElementById("product-form");
    form.reset();
    document.getElementById("product-id").value = "";

    populateCategoryDropdown();
    populateSkinTypeDropdown();
    populateIngredientsDropdown();

    openModal();
}

// Open Add/Edit Modal
function openModal() {
    document.getElementById("product-modal").style.display = "flex";
}

function closeModal() {
    document.getElementById("product-modal").style.display = "none";
    document.getElementById("product-form").reset();
    document.getElementById("product-id").value = "";
}

// Save Product
async function saveProduct(e) {
    e.preventDefault();

    const formElements = {
        productId: document.getElementById("product-id"),
        name: document.getElementById("name"),
        category: document.getElementById("category-dropdown"),
        description: document.getElementById("description"),
        price: document.getElementById("price"),
        skinType: document.getElementById("target-skin-type"),
        ingredients: document.getElementById("active-ingredients"),
        imageUpload: document.getElementById("imageUpload"),
    };

    const name = formElements.name.value.trim();
    const category = formElements.category.value.trim();
    const description = formElements.description.value.trim();
    const price = parseFloat(formElements.price.value.trim());
    const targetSkinType = Array.from(
        formElements.skinType.selectedOptions
    ).map((option) => option.value);
    const activeIngredients = Array.from(
        formElements.ingredients.selectedOptions
    ).map((option) => option.value);

    if (!name || !category || isNaN(price)) {
        alert("Name, category, and price are required fields.");
        return;
    }

    let imageUrl = placeholderImageURL;

    if (formElements.imageUpload.files.length > 0) {
        const file = formElements.imageUpload.files[0];
        if (!validateImageFile(file)) return;
        imageUrl = await convertImageToBase64(file);
    }

    const productData = {
        name,
        category,
        description,
        price,
        targetSkinType,
        activeIngredients,
        imageURL: imageUrl,
    };

    if (formElements.productId.value) {
        await updateDoc(doc(db, "products", formElements.productId.value), productData);
    } else {
        const nextId = `P${String(products.length + 1).padStart(3, "0")}`;
        await setDoc(doc(collection(db, "products"), nextId), { id: nextId, ...productData });
    }

    closeModal();
    fetchProducts();
}

// Populate Dropdowns
function populateCategoryDropdown() {
    const categoryDropdown = document.getElementById("category-dropdown");
    categoryDropdown.innerHTML = '<option value="">Select Category</option>';
    categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        categoryDropdown.appendChild(option);
    });
}

function populateCategoryFilter() {
    const categoryFilter = document.getElementById("category-filter");
    categoryFilter.innerHTML = '<option value="">All Categories</option>';
    categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
}

function populateSkinTypeDropdown() {
    const skinTypeDropdown = document.getElementById("target-skin-type");
    skinTypeDropdown.innerHTML = "";
    skinTypes.forEach((type) => {
        const option = document.createElement("option");
        option.value = type;
        option.textContent = type;
        skinTypeDropdown.appendChild(option);
    });
}

function populateIngredientsDropdown() {
    const ingredientsDropdown = document.getElementById("active-ingredients");
    ingredientsDropdown.innerHTML = ""; // Clear existing options

    activeIngredients.forEach((ingredient) => {
        const option = document.createElement("option");
        option.value = ingredient;
        option.textContent = ingredient;
        ingredientsDropdown.appendChild(option);
    });
}

// Filtering and Sorting
// Filtering and Sorting
function filterProducts() {
    const searchValue = document.getElementById("search-bar").value.toLowerCase();
    const categoryValue = document.getElementById("category-filter").value;
    const sortValue = document.getElementById("sort-filter").value; // Sort filter element

    let filteredProducts = products.filter((product) => {
        const matchesName = !searchValue || product.name.toLowerCase().includes(searchValue);
        const matchesCategory = !categoryValue || product.category === categoryValue;
        return matchesName && matchesCategory;
    });

    // Sorting logic
    if (sortValue) {
        if (sortValue === "price-low-high") {
            filteredProducts.sort((a, b) => a.price - b.price);
        } else if (sortValue === "price-high-low") {
            filteredProducts.sort((a, b) => b.price - a.price);
        } else if (sortValue === "name-a-z") {
            filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortValue === "name-z-a") {
            filteredProducts.sort((a, b) => b.name.localeCompare(a.name));
        }
    }

    displayProducts(filteredProducts);
}

// Event Listeners
document.getElementById("add-product-btn").addEventListener("click", addNewProduct);
document.getElementById("close-modal-btn").addEventListener("click", closeModal);
document.getElementById("cancel-product-btn").addEventListener("click", closeModal); // Added this
document.getElementById("product-form").addEventListener("submit", saveProduct);
document.getElementById("cancel-delete-btn").addEventListener("click", closeDeleteModal);
document.getElementById("confirm-delete-btn").addEventListener("click", confirmDelete);
document.getElementById("apply-filters").addEventListener("click", filterProducts);
document.getElementById("sort-filter").addEventListener("change", filterProducts);


// Expose Functions to Global Scope
window.editProduct = editProduct;
window.openDeleteModal = openDeleteModal;

// Fetch Products on Load
fetchProducts();

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