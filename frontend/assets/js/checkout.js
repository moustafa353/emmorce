import { api } from './api.js';

let selectedLocation = null;
let map, marker;
let checkoutItems = [];

window.addEventListener("DOMContentLoaded", initCheckout);

function initCheckout() {
    checkoutItems = JSON.parse(localStorage.getItem("checkoutItems")) || [];
    renderOrderSummary();
    initMap();
    initFormHandler();
}

function renderOrderSummary() {
    const listContainer = document.getElementById("checkout-list");
    const totalSpan = document.getElementById("order-total");

    if (!listContainer || !totalSpan) return;

    listContainer.innerHTML = '';
    let total = 0;

    if (checkoutItems.length === 0) {
        const p = document.createElement('p');
        p.textContent = "Your cart is empty.";
        listContainer.appendChild(p);
        totalSpan.textContent = "$0.00";
        return;
    }

    checkoutItems.forEach(item => {
        const li = document.createElement("li");
        li.style.display = "flex";
        li.style.alignItems = "center";
        li.style.justifyContent = "space-between";
        li.style.marginBottom = "10px";

        const infoDiv = document.createElement("div");
        infoDiv.style.display = "flex";
        infoDiv.style.alignItems = "center";
        infoDiv.style.gap = "10px";

        const img = document.createElement("img");
        img.src = item.image || 'assets/images/placeholder.jpg';
        img.style.width = "50px";
        img.style.height = "50px";
        img.style.objectFit = "cover";
        img.style.borderRadius = "4px";

        const span = document.createElement("span");
        span.textContent = `${item.name} × ${item.quantity}`;

        infoDiv.appendChild(img);
        infoDiv.appendChild(span);

        const priceB = document.createElement("b");
        const itemTotal = item.price * item.quantity;
        priceB.textContent = `$${itemTotal.toFixed(2)}`;

        li.appendChild(infoDiv);
        li.appendChild(priceB);
        listContainer.appendChild(li);

        total += itemTotal;
    });

    totalSpan.textContent = `$${total.toFixed(2)}`;
}

function initMap() {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    const defaultCoords = [30.0444, 31.2357];
    map = L.map('map').setView(defaultCoords, 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    map.on('click', function (e) {
        updateLocation(e.latlng.lat, e.latlng.lng);
    });

    const gpsBtn = document.getElementById('gps-btn');
    if (gpsBtn) {
        gpsBtn.addEventListener('click', () => {
            if (!navigator.geolocation) {
                alert('Geolocation is not supported by your browser');
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    updateLocation(latitude, longitude);
                    map.setView([latitude, longitude], 12);
                },
                (err) => {
                    console.error(err);
                    alert('Unable to fetch your location.');
                }
            );
        });
    }
}

function updateLocation(lat, lng) {
    if (marker) map.removeLayer(marker);
    marker = L.marker([lat, lng]).addTo(map);
    selectedLocation = { lat, lng };
}

function initFormHandler() {
    const checkoutForm = document.getElementById("checkoutForm");
    if (!checkoutForm) return;

    checkoutForm.addEventListener("submit", handleOrderSubmit);
}

async function handleOrderSubmit(e) {
    e.preventDefault();

    if (checkoutItems.length === 0) {
        alert("Your cart is empty.");
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.textContent : 'Place Order';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';
    }

    try {
        const formData = {
            fullName: document.getElementById("fullName").value,
            email: document.getElementById("email").value,
            phone: document.getElementById("phone").value,
            secondaryPhone: document.getElementById("secondaryPhone").value || null,
            governorate: document.getElementById("governorate").value,
            city: document.getElementById("city").value,
            address: document.getElementById("address").value,
            notes: document.getElementById("notes").value || "No notes"
        };

        const total = checkoutItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const orderData = {
            customer: {
                fullName: formData.fullName,
                email: formData.email,
                phone: formData.phone,
                secondaryPhone: formData.secondaryPhone
            },
            shipping: {
                governorate: formData.governorate,
                city: formData.city,
                address: formData.address,
                notes: formData.notes,
                location: selectedLocation
            },
            items: checkoutItems,
            total: total,
            orderNumber: "ORD-" + Math.floor(100000 + Math.random() * 900000),
            date: new Date().toISOString()
        };

        const result = await api.post('/orders', orderData);

        if (result.success || result.orderId) {
            sessionStorage.setItem("currentOrder", JSON.stringify(orderData));
            localStorage.removeItem("checkoutItems");
            window.location.href = "thank-you.html";
        } else {
            throw new Error(result.error || 'Unknown error');
        }

    } catch (error) {
        console.error('Order error:', error);
        alert('Error placing order: ' + error.message);
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    }
}
