import { registerPage, navigateTo, socket } from '../main.js';

registerPage('lobby', (container) => {
  // Get logged in user back
  let userStr = localStorage.getItem('poker_user');
  let user = userStr ? JSON.parse(userStr) : { name: 'Player' };

  container.innerHTML = `
    <div style="position: fixed; top: 20px; right: 25px; z-index: 100; color: var(--text-secondary); display: flex; align-items: center; gap: 15px;" class="animate-fade-in">
      <span>Welcome, <strong class="text-gold">${user.name}</strong></span>
      <button id="btn-logout" class="btn btn-secondary" style="padding: 6px 14px; font-size: 0.85rem; letter-spacing: 1px;">Logout</button>
    </div>

    <div class="lobby-container animate-fade-in">
      <div class="lobby-decoration">♠ ♥ ♦ ♣</div>
      <h1 class="lobby-title">Texas Hold'em</h1>
      <p class="lobby-subtitle">Play poker online with friends</p>

      <div class="lobby-form panel">
        <div id="lobby-buttons" class="lobby-actions">
          <button id="btn-create" class="btn btn-primary">Create Room</button>
          <button id="btn-show-join" class="btn btn-secondary">Join Room</button>
        </div>

        <div id="join-section" class="join-section hidden">
          <div class="form-group">
            <label for="room-code">Room Code</label>
            <input type="text" id="room-code" class="input" placeholder="Enter 6-digit code" maxlength="6" autocomplete="off" style="text-transform: uppercase; letter-spacing: 4px; text-align: center; font-size: 1.2rem;">
          </div>
          <div class="lobby-actions">
            <button id="btn-join" class="btn btn-primary">Join Game</button>
            <button id="btn-back" class="btn btn-secondary">Back</button>
          </div>
        </div>

        <div id="lobby-error" class="error-message hidden"></div>
      </div>
    </div>
  `;

  // Elements
  const roomCodeInput = document.getElementById('room-code');
  const lobbyButtons = document.getElementById('lobby-buttons');
  const joinSection = document.getElementById('join-section');
  const errorMsg = document.getElementById('lobby-error');

  // Logout
  document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('poker_token');
    localStorage.removeItem('poker_user');
    socket.disconnect();
    navigateTo('login');
  });

  // Show join section
  document.getElementById('btn-show-join').addEventListener('click', () => {
    lobbyButtons.classList.add('hidden');
    joinSection.classList.remove('hidden');
    roomCodeInput.focus();
  });

  document.getElementById('btn-back').addEventListener('click', () => {
    joinSection.classList.add('hidden');
    lobbyButtons.classList.remove('hidden');
  });

  // Create room
  document.getElementById('btn-create').addEventListener('click', () => {
    socket.emit('create-room', { name: user.name }, (res) => {
      if (res.success) {
        navigateTo('room', { room: res.room, isHost: true, myName: user.name });
      } else {
        showError(res.error);
      }
    });
  });

  // Join room
  document.getElementById('btn-join').addEventListener('click', () => {
    const code = roomCodeInput.value.trim().toUpperCase();
    if (!code || code.length < 6) return showError('Please enter a valid 6-digit room code');

    socket.emit('join-room', { code, name: user.name }, (res) => {
      if (res.success) {
        navigateTo('room', { room: res.room, isHost: false, myName: user.name });
      } else {
        showError(res.error);
      }
    });
  });

  // Enter key support
  roomCodeInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-join').click();
  });

  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.remove('hidden');
    setTimeout(() => errorMsg.classList.add('hidden'), 3000);
  }
});
