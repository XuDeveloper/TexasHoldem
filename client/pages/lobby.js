import { registerPage, navigateTo, socket } from '../main.js';

registerPage('lobby', (container) => {
    container.innerHTML = `
    <div class="lobby-container animate-fade-in">
      <div class="lobby-decoration">♠ ♥ ♦ ♣</div>
      <h1 class="lobby-title">Texas Hold'em</h1>
      <p class="lobby-subtitle">Play poker with friends online</p>

      <div class="lobby-form panel">
        <div class="form-group">
          <label for="nickname">Your Nickname</label>
          <input type="text" id="nickname" class="input" placeholder="Enter your name" maxlength="12" autocomplete="off">
        </div>

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

      <p class="lobby-footer">Built with ♥ | No login required</p>
    </div>
  `;

    // Elements
    const nicknameInput = document.getElementById('nickname');
    const roomCodeInput = document.getElementById('room-code');
    const lobbyButtons = document.getElementById('lobby-buttons');
    const joinSection = document.getElementById('join-section');
    const errorMsg = document.getElementById('lobby-error');

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
        const name = nicknameInput.value.trim();
        if (!name) return showError('Please enter a nickname');

        socket.emit('create-room', { name }, (res) => {
            if (res.success) {
                navigateTo('room', { room: res.room, isHost: true, myName: name });
            } else {
                showError(res.error);
            }
        });
    });

    // Join room
    document.getElementById('btn-join').addEventListener('click', () => {
        const name = nicknameInput.value.trim();
        const code = roomCodeInput.value.trim().toUpperCase();
        if (!name) return showError('Please enter a nickname');
        if (!code || code.length < 6) return showError('Please enter a valid room code');

        socket.emit('join-room', { code, name }, (res) => {
            if (res.success) {
                navigateTo('room', { room: res.room, isHost: false, myName: name });
            } else {
                showError(res.error);
            }
        });
    });

    // Enter key support
    nicknameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !joinSection.classList.contains('hidden')) {
            document.getElementById('btn-join').click();
        }
    });
    roomCodeInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('btn-join').click();
    });

    function showError(msg) {
        errorMsg.textContent = msg;
        errorMsg.classList.remove('hidden');
        setTimeout(() => errorMsg.classList.add('hidden'), 3000);
    }
});
