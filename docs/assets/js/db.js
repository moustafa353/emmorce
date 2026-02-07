const DB_NAME = 'fashionDB';
const DB_VERSION = 1;
let db;

export function openDB() {
    return new Promise((resolve, reject) => {
        if (db) return resolve(db);
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            db = e.target.result;
            if (!db.objectStoreNames.contains('products')) db.createObjectStore('products', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('users')) db.createObjectStore('users', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('cart')) db.createObjectStore('cart', { keyPath: 'id', autoIncrement: true });
            if (!db.objectStoreNames.contains('orders')) db.createObjectStore('orders', { autoIncrement: true });
        };
        request.onsuccess = (e) => { db = e.target.result; resolve(db); };
        request.onerror = (e) => reject(e.target.error);
    });
}

export function saveOrder(orderData) {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await openDB();
            const tx = db.transaction('orders', 'readwrite');
            const store = tx.objectStore('orders');
            const req = store.add(orderData);
            
            req.onsuccess = () => resolve(req.result);
            req.onerror = (e) => reject(e.target.error);
            
            tx.oncomplete = () => {};
            tx.onerror = (e) => reject(e.target.error);
        } catch (error) {
            reject(error);
        }
    });
}

export function seedProducts() {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await openDB();
            const tx = db.transaction('products', 'readwrite');
            const store = tx.objectStore('products');

            tx.oncomplete = () => resolve();
            tx.onerror = (e) => {
                reject(e.target.error);
            };

            const countRequest = store.count();
            countRequest.onsuccess = () => {
                if (countRequest.result > 0) {
                        return;
                }

                const sampleProducts = [
                    { id: 1, name: 'watches', price: 120, category: 'watches', image: 'assets/images/1.jpg', stock: 10 },
                    { id: 2, name: 'shoes', price: 350, category: 'shoes', image: 'assets/images/2.jpg', stock: 5 },
                    { id: 3, name: 'shoes', price: 500, category: 'shoes', image: 'assets/images/3.jpg', stock: 8 },
                    { id: 4, name: 'shoes', price: 700, category: 'shoes', image: 'assets/images/4.jpg', stock: 4 },
                    { id: 5, name: 't-shirts', price: 80, category: 't-shirts', image: 'assets/images/5.jpg', stock: 15 }
                ];
                sampleProducts.forEach(p => store.add(p));
            };
            countRequest.onerror = (e) => {
                reject(e.target.error);
            };
        } catch (err) {
            reject(err);
        }
    });
}
