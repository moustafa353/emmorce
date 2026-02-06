import { openDB } from './db.js';
import { getProductById } from './products.js';
import { getCurrentUser } from './auth.js';

const getUserId = () => {
    const user = getCurrentUser();
    return user ? user.id : 'guest';
};

export async function addToCart(productId, quantity = 1) {
    const db = await openDB();
    const product = await getProductById(productId);
    if (!product) throw new Error('Product not found');

    return new Promise((resolve, reject) => {
        const tx = db.transaction('cart', 'readwrite');
        const store = tx.objectStore('cart');

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);

        store.openCursor().onsuccess = async (e) => {
            const cursor = e.target.result;
            if (cursor) {
                const item = cursor.value;
                if (item.userId === getUserId() && item.productId === productId) {
                    item.quantity += quantity;
                    cursor.update(item);
                    return;
                }
                cursor.continue();
            } else {
                store.add({
                    userId: getUserId(),
                    productId,
                    quantity,
                    name: product.name,
                    price: product.price,
                    image: product.image
                });
            }
        };
    });
}

export async function getCartItems() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('cart', 'readonly');
        const store = tx.objectStore('cart');

        tx.onerror = () => reject(tx.error);

        const req = store.getAll();
        req.onsuccess = () => {
            const items = req.result.filter(i => i.userId === getUserId());
            resolve(items);
        };
        req.onerror = (e) => reject(e.target.error);
    });
}

export async function updateCartQuantity(id, quantity) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('cart', 'readwrite');
        const store = tx.objectStore('cart');

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);

        store.get(Number(id)).onsuccess = (e) => {
            const item = e.target.result;
            if (item) {
                item.quantity = quantity;
                store.put(item);
            } else {
                reject(new Error('Cart item not found'));
            }
        };
    });
}

export async function removeFromCart(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('cart', 'readwrite');
        const store = tx.objectStore('cart');

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);

        store.delete(Number(id));
    });
}

export async function clearCart() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('cart', 'readwrite');
        const store = tx.objectStore('cart');

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);

        store.openCursor().onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
                if (cursor.value.userId === getUserId()) store.delete(cursor.key);
                cursor.continue();
            }
        };
    });
}

export async function updateCartCount() {
    const items = await getCartItems();
    const count = items.reduce((sum, i) => sum + i.quantity, 0);
    document.querySelectorAll('.cart-count').forEach(el => el.textContent = count);
}
