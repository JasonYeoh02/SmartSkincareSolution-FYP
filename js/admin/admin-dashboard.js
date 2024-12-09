import { db, auth } from "../firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

let salesData = [];

// Load stats for the dashboard
async function loadDashboardStats() {
    const totalUsersElement = document.getElementById("total-users");
    const totalProductsElement = document.getElementById("total-products");
    const totalOrdersElement = document.getElementById("total-orders");

    try {
        // Fetch total users
        const usersSnapshot = await getDocs(collection(db, "users"));
        totalUsersElement.textContent = usersSnapshot.size;

        // Fetch total products
        const productsSnapshot = await getDocs(collection(db, "products"));
        totalProductsElement.textContent = productsSnapshot.size;

        // Fetch total orders
        const ordersSnapshot = await getDocs(collection(db, "orders"));
        totalOrdersElement.textContent = ordersSnapshot.size;

        // Fetch and render analytics
        await loadSalesAnalytics();
    } catch (error) {
        console.error("Error loading dashboard stats:", error);
        totalUsersElement.textContent = "Error";
        totalProductsElement.textContent = "Error";
        totalOrdersElement.textContent = "Error";
    }
}

// Load sales analytics
async function loadSalesAnalytics() {
    try {
        const salesSnapshot = await getDocs(collection(db, "sales"));
        salesData = [];

        salesSnapshot.forEach((doc) => {
            const data = doc.data();
            const { monthYear, totalRevenue, monthlyBreakdown } = data;

            salesData.push({
                monthYear,
                totalRevenue,
                weeklyBreakdown: Object.values(monthlyBreakdown),
            });
        });

        renderSalesChart(salesData);
        populateMonthSelector();
        renderFinancialChart(salesData[0]?.weeklyBreakdown || []);
    } catch (error) {
        console.error("Error loading sales analytics:", error);
    }
}

// Populate month selector
function populateMonthSelector() {
    const monthSelector = document.getElementById("month-selector");
    monthSelector.innerHTML = "";

    salesData.forEach((data, index) => {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = data.monthYear;
        monthSelector.appendChild(option);
    });

    monthSelector.addEventListener("change", (event) => {
        const selectedIndex = event.target.value;
        const weeklyData = salesData[selectedIndex]?.weeklyBreakdown || [];
        renderFinancialChart(weeklyData);
    });
}

// Render sales chart
function renderSalesChart(data) {
    google.charts.load("current", { packages: ["corechart"] });
    google.charts.setOnLoadCallback(() => {
        const chartData = [["Month", "Revenue"]];
        data.forEach((item) => chartData.push([item.monthYear, item.totalRevenue]));

        const dataTable = google.visualization.arrayToDataTable(chartData);

        const options = {
            title: "Monthly Sales Revenue",
            colors: ["#004d40"],
            backgroundColor: "#f9f9f9",
        };

        const chart = new google.visualization.LineChart(document.getElementById("sales-chart"));
        chart.draw(dataTable, options);
    });
}

// Render financial chart
function renderFinancialChart(weeklyBreakdown) {
    google.charts.load("current", { packages: ["corechart"] });
    google.charts.setOnLoadCallback(() => {
        const chartData = [["Week", "Revenue"]];
        weeklyBreakdown.forEach((value, index) => chartData.push([`Week ${index + 1}`, value]));

        const dataTable = google.visualization.arrayToDataTable(chartData);

        const options = {
            title: "Weekly Financial Breakdown",
            pieHole: 0.4,
            colors: ["#004D99", "#3D7317", "#3D2785", "#A3A3A3"],
            backgroundColor: "#f9f9f9",
        };

        const chart = new google.visualization.PieChart(document.getElementById("financial-chart"));
        chart.draw(dataTable, options);
    });
}

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

// Load stats on page load
window.addEventListener("DOMContentLoaded", loadDashboardStats);
