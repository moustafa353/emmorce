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
            if (!db.objectStoreNames.contains('users')) db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
            if (!db.objectStoreNames.contains('cart')) db.createObjectStore('cart', { keyPath: 'id', autoIncrement: true });
            if (!db.objectStoreNames.contains('orders')) db.createObjectStore('orders', { keyPath: 'id', autoIncrement: true });
        };
        request.onsuccess = (e) => { db = e.target.result; resolve(db); };
        request.onerror = (e) => reject(e.target.error);
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
                console.error("Seeding transaction failed:", e.target.error);
                reject(e.target.error);
            };

            const countRequest = store.count();
            countRequest.onsuccess = () => {
                if (countRequest.result > 0) {
                    console.log("Products already seeded.");
                    return;
                }

                const sampleProducts = [
                    { id: 1, name: 'T-Shirt', price: 120, category: 'Clothing', image: 'assets/images/1.jpg', colors: [{ id: 101, colorName: 'Black', colorCode: '#000', image: 'assets/images/1.jpg' }], stock: 10 },
                    { id: 2, name: 'Jeans', price: 350, category: 'Clothing', image: 'assets/images/2.jpg', colors: [{ id: 102, colorName: 'Blue', colorCode: '#00f', image: 'assets/images/2.jpg' }], stock: 5 },
                    { id: 3, name: 'Sneakers', price: 500, category: 'Shoes', image: 'assets/images/3.jpg', colors: [{ id: 103, colorName: 'White', colorCode: '#fff', image: 'assets/images/3.jpg' }], stock: 8 },
                    { id: 4, name: 'Jacket', price: 700, category: 'Clothing', image: 'assets/images/4.jpg', colors: [{ id: 104, colorName: 'Brown', colorCode: '#964B00', image: 'assets/images/4.jpg' }], stock: 4 },
                    { id: 5, name: 'Hat', price: 80, category: 'Accessories', image: 'assets/images/5.jpg', colors: [{ id: 105, colorName: 'Red', colorCode: '#f00', image: 'assets/images/5.jpg' }], stock: 15 }
                ];
                sampleProducts.forEach(p => store.add(p));
            };
            countRequest.onerror = (e) => {
                console.error("Count request failed", e);
                reject(e.target.error);
            };
        } catch (err) {
            console.error("Seeding error:", err);
            reject(err);
        }
    });
}
