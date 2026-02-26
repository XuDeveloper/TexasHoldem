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
    import('./pages/lobby.js'),
    import('./pages/room.js'),
    import('./pages/game.js'),
]).then(() => {
    navigateTo('lobby');
});

export { socket };
