import { registerPage, navigateTo, socket } from '../main.js';

registerPage('lobby', (container) => {
    // Get logged in user back
    let userStr = localStorage.getItem('poker_user');
    let user = userStr ? JSON.parse(userStr) : { name: 'Player' };

    container.innerHTML = `
    <div class="lobby-container animate-fade-in">
      <div style="position: absolute; top: 15px; right: 20px; color: var(--text-secondary); display: flex; align-items: center; gap: 15px;">
        <span>Welcome, <strong class="text-gold">${user.name}</strong></span>
        <button id="btn-logout" class="btn btn-secondary" style="padding: 4px 10px; font-size: 0.8rem;">Logout</button>
      </div>
      <div class="lobby-decoration">♠ ♥ ♦ ♣</div>
      <h1 class="lobby-title">德州扑克</h1>
      <p class="lobby-subtitle">和朋友一起在线玩扑克</p>

      <div class="lobby-form panel">
        <div id="lobby-buttons" class="lobby-actions">
          <button id="btn-create" class="btn btn-primary">创建房间</button>
          <button id="btn-show-join" class="btn btn-secondary">加入房间</button>
        </div>

        <div id="join-section" class="join-section hidden">
          <div class="form-group">
            <label for="room-code">房间代码</label>
            <input type="text" id="room-code" class="input" placeholder="输入6位房间码" maxlength="6" autocomplete="off" style="text-transform: uppercase; letter-spacing: 4px; text-align: center; font-size: 1.2rem;">
          </div>
          <div class="lobby-actions">
            <button id="btn-join" class="btn btn-primary">加入游戏</button>
            <button id="btn-back" class="btn btn-secondary">返回</button>
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
        if (!code || code.length < 6) return showError('请输入有效的房间代码');

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
