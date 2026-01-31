import { openDB } from './db.js';

export function initAuth() {
    const user = JSON.parse(localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser'));
    updateAuthUI(user);
}

export function updateAuthUI(user) {
    const loginBtn = document.querySelector('.login-btn');
    const logoutBtn = document.querySelector('.logout-btn');
    const welcome = document.querySelector('.welcome-user');
    if (user) {
        loginBtn?.classList.add('hidden');
        logoutBtn?.classList.remove('hidden');
        if (welcome) welcome.textContent = `Hello, ${user.name}`;
    } else {
        loginBtn?.classList.remove('hidden');
        logoutBtn?.classList.add('hidden');
        if (welcome) welcome.textContent = '';
    }
}

export async function login(email, password) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('users', 'readonly');
        const store = tx.objectStore('users');
        let foundUser = null;

        tx.oncomplete = () => resolve(foundUser);
        tx.onerror = () => reject(tx.error);

        const req = store.getAll();
        req.onsuccess = () => {
            const users = req.result;

            // Priority check for hardcoded users
            if (email === 'admin@demo.com' && password === 'admin123') {
                foundUser = { id: 1, name: 'Admin User', email, role: 'admin' };
            } else if (email === 'user@demo.com' && password === 'user123') {
                foundUser = { id: 2, name: 'Demo User', email, role: 'user' };
            } else {
                foundUser = users.find(u => u.email === email && u.password === password);
            }
            if (!foundUser) {
                // We don't reject here, we just let result be null and reject manually if desired, 
                // or simpler: we can abort the transaction or just resolve(null) and handle it?
                // Original code rejected. To reject from within onsuccess for a transaction, 
                // we can abort the tx with a custom error, or just reject the promise directly 
                // BUT we must be careful about the oncomplete listener.
                // A cleaner way for 'logical' failure (not DB failure) is to just let tx complete 
                // and check result, OR reject explicitly and ensure we don't resolve later.
            }
        };
    }).then(user => {
        if (!user) throw new Error('Invalid email or password');
        return user;
    });
}

export async function register(name, email, password) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('users', 'readwrite');
        const store = tx.objectStore('users');
        let newUser = null;

        tx.oncomplete = () => resolve(newUser);
        tx.onerror = () => reject(tx.error);

        const req = store.getAll();
        req.onsuccess = () => {
            const users = req.result;
            if (users.find(u => u.email === email)) {
                // Logic error, not DB error. 
                // We can't "return reject()" easily because oncomplete will fire.
                // We should abort the transaction.
                tx.abort();
                return reject(new Error('Email already exists'));
            }
            const id = Date.now();
            newUser = { id, name, email, password, role: 'user' };
            store.add(newUser);
            // newUser is set, will be returned in oncomplete
        };
    });
}
