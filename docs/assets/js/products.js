import { openDB } from './db.js';

export async function getProducts(category) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('products', 'readonly');
        const store = tx.objectStore('products');
        const req = store.getAll();
        req.onsuccess = () => {
            let products = req.result;
            if (category) products = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
            resolve(products);
        };
        req.onerror = (e) => reject(e.target.error);
    });
}

export async function getProductById(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('products', 'readonly');
        const store = tx.objectStore('products');
        const req = store.get(Number(id));
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e.target.error);
    });
}

export async function saveProduct(product) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('products', 'readwrite');
        const store = tx.objectStore('products');

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);

        if (!product.id) product.id = Date.now();
        store.put(product);
    });
}

export async function deleteProduct(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('products', 'readwrite');
        const store = tx.objectStore('products');

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);

        store.delete(id);
    });
}
