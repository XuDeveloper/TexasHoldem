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
// Pages will be registered by their modules
// Start with lobby page
import('./pages/lobby.js').then(() => {
    navigateTo('lobby');
});

export { socket };
