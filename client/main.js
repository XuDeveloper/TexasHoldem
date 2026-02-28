import socket from './socket.js';

// ---- Page Router ----
const app = document.getElementById('app');

// Simple client-side router
const pages = {};

export function registerPage(name, renderFn) {
    pages[name] = renderFn;
}

export function navigateTo(pageName, data = {}) {
    if (pages[pageName]) {
        app.innerHTML = '';
        pages[pageName](app, data);
    } else {
        console.error(`Page "${pageName}" not found`);
    }
}

// ---- Initialize ----
// Register all pages
Promise.all([
    import('./pages/login.js').then(m => registerPage('login', m.initLogin)),
    import('./pages/lobby.js'),
    import('./pages/room.js'),
    import('./pages/game.js'),
]).then(() => {
    const token = localStorage.getItem('poker_token');
    if (!token) {
        navigateTo('login');
    } else {
        socket.auth = { token };
        socket.connect();
        navigateTo('lobby');
    }
});

// Automatically handle token invalidation server-side
socket.on('connect_error', (err) => {
    if (err.message === 'Authentication error') {
        localStorage.removeItem('poker_token');
        localStorage.removeItem('poker_user');
        navigateTo('login');
    }
});

export { socket };
