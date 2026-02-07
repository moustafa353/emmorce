import { updateAuthUI, initAuth, login, register, getCurrentUser } from './auth.js';
import { getProducts } from './products.js';
import { addToCart, updateCartCount, getCartItems, updateCartQuantity, removeFromCart } from './cart.js';
import { seedProducts } from './db.js';



document.addEventListener('DOMContentLoaded', async () => {
    initAuth();
    const currentUser = getCurrentUser();
    updateAuthUI(currentUser);
    await seedProducts();
    await updateCartCount();
    const productGrids = document.querySelectorAll('.products-grid');
    if (productGrids.length > 0) await loadProducts();
    setupFilters();
    const cartItemsContainer = document.getElementById('cart-items');
    if (cartItemsContainer) await renderCartPage();
    const checkoutBtn = document.getElementById('proceed-to-checkout');
    if (checkoutBtn) checkoutBtn.addEventListener('click', (e) => handleCheckout(e));
    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', (e) => handleLoginForm(e));
    const signupForm = document.getElementById('signup-form');
    if (signupForm) signupForm.addEventListener('submit', (e) => handleSignupForm(e));
    const menuBtn = document.getElementById('menu-btn');
    const navLinks = document.getElementById('nav-links');
    if (menuBtn && navLinks) menuBtn.addEventListener('click', () => navLinks.classList.toggle('active'));
});


async function handleCheckout(e) {
    e.preventDefault();
    try {
        const items = await getCartItems();
        if (items.length === 0) {
            alert('Your cart is empty');
            return;
        }
        localStorage.setItem('checkoutItems', JSON.stringify(items));
        window.location.href = 'checkout.html';
    } catch (error) {
        console.error(error);
        alert('Error proceeding to checkout: ' + error.message);
    }
}

async function handleLoginForm(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const user = await login(email, password);
        if (user) {
            localStorage.setItem('currentUser', JSON.stringify(user));
            if (user.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'index.html';
            }
        }
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

async function handleSignupForm(e) {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        await register(name, email, password);
        alert('Account created! Please login.');
        window.location.href = 'login.html';
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}


function setupFilters() {
    const categoryFilter = document.getElementById('category-filter');
    const sortBy = document.getElementById('sort-by');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    if (categoryFilter) categoryFilter.addEventListener('change', () => loadProducts(categoryFilter.value, sortBy?.value, searchInput?.value));
    if (sortBy) sortBy.addEventListener('change', () => loadProducts(categoryFilter?.value, sortBy.value, searchInput?.value));
    if (searchInput) {
        searchInput.addEventListener('input', () => loadProducts(categoryFilter?.value, sortBy?.value, searchInput.value));
        searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') loadProducts(categoryFilter?.value, sortBy?.value, searchInput.value); });
    }
    if (searchBtn) searchBtn.addEventListener('click', () => loadProducts(categoryFilter?.value, sortBy?.value, searchInput?.value));
}

async function loadProducts(category, sortBy, searchQuery) {
    const products = await getProducts(category);
    const productGrids = document.querySelectorAll('.products-grid');
    if (productGrids.length === 0) return;
    let filtered = products.filter(p => {
        let match = true;
        if (searchQuery) match = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase());
        return match;
    });
    if (sortBy) {
        filtered.sort((a, b) => {
            if (sortBy === 'price-asc') return a.price - b.price;
            if (sortBy === 'price-desc') return b.price - a.price;
            if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
            if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
            return 0;
        });
    }
    const html = filtered.map(product => {
        let displayImage = product.image;
        return `
            <div class="product-card">
                <div class="product-image-container">
                    <img src="${displayImage}" alt="${product.name}">
                </div>
                <div class="product-info">
                    <p class="category">${product.category || ''}</p>
                    <h3>${product.name}</h3>
                    <div class="price-container"><span class="price">${product.price.toFixed(2)}EGP</span></div>
                  
                    <button class="btn add-to-cart-btn" data-id="${product.id}" style="margin-top:0.5rem; width:100%;">Add to Cart</button>
                </div>
            </div>`;
    }).join('');

    productGrids.forEach(grid => {
        grid.innerHTML = html;
        grid.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const productId = Number(e.target.dataset.id);
                try {
                    await addToCart(productId, 1);
                    alert('Added to cart!');
                    await updateCartCount();
                } catch (err) {
                    console.error(err);
                    alert('Error adding to cart: ' + err.message);
                }
            });
        });
    });
}



async function renderCartPage() {
    const container = document.getElementById('cart-items');
    const subtotalEl = document.getElementById('subtotal');
    const totalEl = document.getElementById('total');
    if (!container) return;
    const items = await getCartItems();
    if (items.length === 0) {
        container.innerHTML = `<div class="empty-cart"><p>Your cart is empty</p><a href="products.html" class="btn">Continue Shopping</a></div>`;
        if (subtotalEl) subtotalEl.textContent = '$0.00';
        if (totalEl) totalEl.textContent = '$0.00';
        return;
    }
    let subtotal = 0;
    container.innerHTML = items.map(item => {
        const line = item.price * item.quantity;
        subtotal += line;
        return `<div class="cart-item" data-id="${item.id}" data-product-id="${item.productId}">
            <img src="${item.image}" alt="${item.name}" style="width:80px;height:80px;object-fit:cover;margin-right:1rem;"/>
            <div class="cart-item-details" style="flex:1;">
                <h3>${item.name}</h3>
                <p class="price">${item.price.toFixed(2)}EGP</p>
                <input type="number" class="qty-input" min="1" value="${item.quantity}" style="width:50px;margin:0.5rem 0"/>
           <button class="remove-item" style="">Remove</button>
                </div>
           
        </div>`;
    }).join('');
    if (subtotalEl) subtotalEl.textContent = subtotal.toFixed(2) + 'EGP';
    if (totalEl) totalEl.textContent = subtotal.toFixed(2) + 'EGP';
    container.querySelectorAll('.qty-input').forEach(input => {
        input.addEventListener('change', async e => {
            let id = Number(e.target.closest('.cart-item').dataset.id);
            let val = Number(e.target.value);
            if (val < 1) val = 1;
            await updateCartQuantity(id, val);
            renderCartPage();
            updateCartCount();
        });
    });
    container.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', async e => {
            let id = Number(e.target.closest('.cart-item').dataset.id);
            await removeFromCart(id);
            renderCartPage();
            updateCartCount();
        });
    });
}
