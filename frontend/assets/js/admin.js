import { saveProduct, deleteProduct, getProducts } from './products.js';
import { openDB, seedProducts } from './db.js';
import { requireRole } from './auth.js';

requireRole('admin');

const tabs = document.querySelectorAll('.nav-item');
const tabSections = document.querySelectorAll('.tab');
const productsListEl = document.getElementById('products-list');
const ordersListEl = document.getElementById('orders-list');
const statsRevenueEl = document.getElementById('stat-revenue');
const statsOrdersEl = document.getElementById('stat-orders');
const statsAovEl = document.getElementById('stat-aov');

const productForm = document.getElementById('product-form');
const pId = document.getElementById('product-id');
const pName = document.getElementById('p-name');
const pPrice = document.getElementById('p-price');
const pStock = document.getElementById('p-stock');
const pCategory = document.getElementById('p-category');
const pImage = document.getElementById('p-image');
const pDesc = document.getElementById('p-desc');
const productFormTitle = document.getElementById('product-form-title');
const productCancel = document.getElementById('product-cancel');

const themeToggle = document.getElementById('theme-toggle');
const exportBtn = document.getElementById('export-orders');

let imageBase64 = '';
pImage.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => imageBase64 = reader.result;
    reader.readAsDataURL(file);
});

const applyTheme = (theme) => { document.body.classList.toggle('dark', theme === 'dark'); localStorage.setItem('admin-theme', theme); };
themeToggle.addEventListener('click', () => { const current = localStorage.getItem('admin-theme') || 'light'; applyTheme(current === 'light' ? 'dark' : 'light'); });
applyTheme(localStorage.getItem('admin-theme') || 'light');

async function getAllProducts() { await seedProducts(); return getProducts(); }

async function renderProducts() {
    const products = await getAllProducts();
    productsListEl.innerHTML = products.length ? '' : '<p>No products</p>';
    products.forEach(p => {
        const row = document.createElement('div'); row.className = 'row';
        row.innerHTML = `
            <div class="left">
                <img class="p-thumb" src="${p.image || 'assets/images/placeholder.jpg'}" alt="">
                <div>
                    <strong>${p.name}</strong> - $${p.price.toFixed(2)}
                </div>
            </div>
            <div class="actions">
                <button data-id="${p.id}" class="btn edit">Edit</button>
                <button data-id="${p.id}" class="btn delete">Delete</button>
            </div>
        `;
        productsListEl.appendChild(row);
    });
    productsListEl.querySelectorAll('.edit').forEach(btn => {
        btn.addEventListener('click', async e => {
            const id = Number(e.target.dataset.id);
            const product = (await getAllProducts()).find(p => p.id === id);
            if (!product) return alert('Product not found');
            pId.value = product.id;
            pName.value = product.name;
            pPrice.value = product.price;
            pStock.value = product.stock;
            pCategory.value = product.category;
            pDesc.value = product.description;
            imageBase64 = product.image || '';
            productFormTitle.textContent = 'Edit Product';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
    productsListEl.querySelectorAll('.delete').forEach(btn => {
        btn.addEventListener('click', async e => {
            if (!confirm('Delete product?')) return;
            await deleteProduct(Number(e.target.dataset.id));
            renderProducts();
        });
    });
}

productForm.addEventListener('submit', async e => {
    e.preventDefault();
    await saveProduct({
        id: pId.value ? Number(pId.value) : null,
        name: pName.value,
        price: Number(pPrice.value),
        stock: Number(pStock.value),
        category: pCategory.value,
        description: pDesc.value,
        image: imageBase64
    });
    productForm.reset();
    pId.value = '';
    imageBase64 = '';
    productFormTitle.textContent = 'Add Product';
    renderProducts();
});

productCancel.addEventListener('click', () => {
    productForm.reset();
    pId.value = '';
    imageBase64 = '';
    productFormTitle.textContent = 'Add Product';
});

async function getOrders() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('orders', 'readonly');
        const store = tx.objectStore('orders');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = e => reject(e.target.error);
    });
}

async function renderOrders() {
    const orders = await getOrders();
    ordersListEl.innerHTML = orders.length ? '' : '<p>No orders</p>';
    orders.forEach(o => {
        const row = document.createElement('div');
        row.className = 'row';
        row.innerHTML = `
            <div class="left">
                <strong>Order ${o.orderNumber || '—'}</strong> - ${new Date(o.date).toLocaleString()} 
                <span>${o.status || 'pending'}</span>
            </div>
            <div class="actions">
                <strong>$${o.total || 0}</strong>
            </div>
        `;
        ordersListEl.appendChild(row);
    });
}

async function renderStats() {
    const orders = await getOrders();
    const now = Date.now();
    const last30 = orders.filter(o => now - new Date(o.date).getTime() <= 30 * 24 * 60 * 60 * 1000);
    const revenue = last30.reduce((s, o) => s + (o.total || 0), 0);
    statsRevenueEl.textContent = `$${revenue.toFixed(2)}`;
    statsOrdersEl.textContent = last30.length;
    statsAovEl.textContent = `$${(last30.length ? revenue / last30.length : 0).toFixed(2)}`;
}

tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    const target = t.dataset.tab;
    tabSections.forEach(s => s.classList.toggle('active', s.id === `tab-${target}`));
    if (target === 'products') renderProducts();
    if (target === 'orders') renderOrders();
    if (target === 'stats') renderStats();
}));

exportBtn.addEventListener('click', async () => {
    const orders = await getOrders();
    if (!orders.length) return alert('No orders to export');
    const rows = [['orderNumber', 'date', 'total']];
    orders.forEach(o => rows.push([o.orderNumber, o.date, o.total]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orders.csv';
    a.click();
    URL.revokeObjectURL(url);
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentUser');
    window.location.href = 'login.html';
});

renderProducts(); renderOrders(); renderStats();
