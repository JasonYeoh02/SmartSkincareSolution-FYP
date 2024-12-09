// Import Firebase services
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js"; // Import Firebase Storage

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBySH8zTbBNDDHr2rRNgpCQ6_wQy9qaSF0",
    authDomain: "skincare-website-new.firebaseapp.com",
    projectId: "skincare-website-new",
    storageBucket: "skincare-website-new.firebasestorage.app",
    messagingSenderId: "950367461864",
    appId: "1:950367461864:web:d3168c5ea7a4018222c45d",
    measurementId: "G-Q4ZHJ4N9XX"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app); // Exporting Auth service
export const db = getFirestore(app); // Exporting Firestore service
export const storage = getStorage(app); // Exporting Storage service
