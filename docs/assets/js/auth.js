import { openDB } from './db.js';

export function initAuth() {
    const user = JSON.parse(localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser') || 'null');
    updateAuthUI(user);
}

export function updateAuthUI(user) {
    const loginBtn = document.querySelector('.login-btn');
    const logoutBtn = document.querySelector('.logout-btn');
    const welcome = document.querySelector('.welcome-user');

    logoutBtn?.addEventListener('click', () => {
        logout();
    });

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

            if (email === 'admin@demo.com' && password === 'admin123') {
                foundUser = { id: 1, name: 'admin', email, role: 'admin' };
            } else if (email === 'user@demo.com' && password === 'user123') {
                foundUser = { id: 2, name: 'Demo User', email, role: 'user' };
            } else {
                foundUser = users.find(u => u.email === email && u.password === password);
            }
            if (!foundUser) {
                console.error('User not found');
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
                tx.abort();
                return reject(new Error('Email already exists'));
            }
            const id = Date.now();
            newUser = { id, name, email, password, role: 'user' };
            store.add(newUser);
        };
    });
}

export function logout() {
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

export function getCurrentUser() {
    const storedUser = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    console.log('Stored user data:', storedUser);
    const user = storedUser ? JSON.parse(storedUser) : null;
    console.log('Parsed user:', user);
    return user;
}

export function hasRole(requiredRole) {
    const user = getCurrentUser();
    console.log('Checking role:', requiredRole, 'User role:', user?.role);
    return user && user.role === requiredRole;
}

export function requireRole(role) {
    console.log('Requiring role:', role);
    if (!hasRole(role)) {
        console.log('Access denied, redirecting to login');
        window.location.href = 'login.html';
        throw new Error(`Access denied. ${role} role required.`);
    }
    console.log('Role check passed');
}
