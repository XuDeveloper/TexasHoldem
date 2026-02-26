import { registerPage } from '../main.js';

registerPage('lobby', (container) => {
    container.innerHTML = `
    <div class="panel animate-fade-in" style="text-align: center; max-width: 480px; width: 90%;">
      <h1 style="font-size: 2.5rem; color: var(--gold); margin-bottom: 8px;">♠ ♥ ♦ ♣</h1>
      <h2 style="font-size: 1.8rem; margin-bottom: var(--spacing-lg);">Texas Hold'em</h2>
      <p style="color: var(--text-secondary); margin-bottom: var(--spacing-xl);">
        Play poker with friends online
      </p>
      <p style="color: var(--text-muted); font-size: 0.9rem;">
        🚧 Setting up... Game coming soon!
      </p>
    </div>
  `;
});
