import { registerPage, navigateTo, socket } from '../main.js';

registerPage('room', (container, { room, isHost, myName }) => {
  let currentRoom = room;
  let amHost = isHost;

  container.innerHTML = `
    <div class="room-container animate-fade-in">
      <div class="room-header">
        <h2 class="room-title">🃏 Waiting Room</h2>
        <div class="room-code-display">
          <span class="room-code-label">Room Code</span>
          <span id="room-code-value" class="room-code-value">${room.id}</span>
          <button id="btn-copy" class="btn-icon" title="Copy Code">📋</button>
        </div>
      </div>

      <div class="room-body panel">
        <div class="players-section">
          <h3>Players <span id="player-count">(${room.players.length}/9)</span></h3>
          <div id="player-list" class="player-list"></div>
        </div>

        <div id="host-controls" class="host-controls ${amHost ? '' : 'hidden'}">
          <button id="btn-add-ai" class="btn btn-secondary">🤖 Add AI</button>
          <button id="btn-start" class="btn btn-primary" ${room.players.length < 2 ? 'disabled' : ''}>▶ Start Game</button>
        </div>

        <div class="chat-section">
          <div id="chat-messages" class="chat-messages"></div>
          <div class="chat-input-row">
            <input type="text" id="chat-input" class="input chat-input" placeholder="Type a message..." maxlength="200">
            <button id="btn-send" class="btn btn-secondary btn-small">Send</button>
          </div>
        </div>
      </div>

      <button id="btn-leave" class="btn btn-danger btn-small">Leave Room</button>
    </div>
  `;

  renderPlayers(currentRoom.players);

  // Copy room code
  document.getElementById('btn-copy').addEventListener('click', () => {
    navigator.clipboard.writeText(room.id);
    const btn = document.getElementById('btn-copy');
    btn.textContent = '✅';
    setTimeout(() => btn.textContent = '📋', 2000);
  });

  // Add AI
  document.getElementById('btn-add-ai')?.addEventListener('click', () => {
    socket.emit('add-ai', (res) => {
      if (!res.success) alert(res.error);
    });
  });

  // Start game
  document.getElementById('btn-start')?.addEventListener('click', () => {
    socket.emit('start-game', (res) => {
      if (!res.success) alert(res.error);
    });
  });

  // Chat
  document.getElementById('btn-send').addEventListener('click', sendChat);
  document.getElementById('chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendChat();
  });

  // Leave
  document.getElementById('btn-leave').addEventListener('click', () => {
    socket.emit('leave-room', () => {
      navigateTo('lobby');
    });
  });

  // Socket events
  socket.on('room-update', (updatedRoom) => {
    currentRoom = updatedRoom;
    amHost = updatedRoom.hostId === socket.id;
    renderPlayers(updatedRoom.players);
    document.getElementById('player-count').textContent = `(${updatedRoom.players.length}/9)`;

    const hostControls = document.getElementById('host-controls');
    if (hostControls) {
      hostControls.classList.toggle('hidden', !amHost);
    }

    const startBtn = document.getElementById('btn-start');
    if (startBtn) {
      startBtn.disabled = updatedRoom.players.length < 2;
    }
  });

  socket.on('game-state', (gameState) => {
    // Remove room page listeners
    socket.off('room-update');
    socket.off('game-state');
    socket.off('chat-message');
    navigateTo('game', { room: currentRoom, gameState, myName });
  });

  socket.on('chat-message', ({ name, message, timestamp }) => {
    appendChat(name, message);
  });

  function sendChat() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg) return;
    socket.emit('chat-message', { message: msg });
    input.value = '';
  }

  function appendChat(name, message) {
    const chatEl = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'chat-msg animate-slide-in';
    div.innerHTML = `<strong class="text-gold">${name}:</strong> ${escapeHtml(message)}`;
    chatEl.appendChild(div);
    chatEl.scrollTop = chatEl.scrollHeight;
  }

  function renderPlayers(players) {
    const list = document.getElementById('player-list');
    list.innerHTML = players.map(p => `
      <div class="player-card ${!p.isConnected ? 'disconnected' : ''} ${p.id === currentRoom.hostId ? 'is-host' : ''}">
        <div class="player-avatar">${p.isAI ? '🤖' : (p.id === currentRoom.hostId ? '👑' : '🎮')}</div>
        <div class="player-info">
          <span class="player-name">${escapeHtml(p.name)}</span>
          <span class="player-chips">💰 ${p.chips}</span>
        </div>
        ${!p.isConnected ? '<span class="player-status text-red">Offline</span>' : ''}
      </div>
    `).join('');
  }
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
