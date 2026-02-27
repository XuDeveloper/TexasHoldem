import { registerPage, navigateTo, socket } from '../main.js';

// Import room page so it's registered
import('./room.js');

registerPage('game', (container, { room, gameState, myName }) => {
  let currentState = gameState;
  let myHand = [];
  let currentRoom = room;
  let showdownHands = {};
  let timerInterval = null;

  container.innerHTML = `
    <div class="game-container">
      <!-- Top Bar -->
      <div class="game-topbar">
        <span class="game-room-code">房间: ${room.id}</span>
        <span class="game-phase" id="game-phase"></span>
        <div class="topbar-right">
          <button id="btn-help" class="btn-icon" title="牌型说明">❓</button>
          <button id="btn-leave-game" class="btn btn-danger btn-small">离开</button>
        </div>
      </div>

      <!-- Poker Table -->
      <div class="table-wrapper">
        <div class="poker-table">
          <div class="table-felt">
            <!-- Community Cards -->
            <div id="community-cards" class="community-cards"></div>
            <!-- Pot -->
            <div id="pot-display" class="pot-display">
              <span class="pot-label">底池</span>
              <span id="pot-amount" class="pot-amount">0</span>
            </div>
          </div>
          <!-- Player Seats -->
          <div id="player-seats" class="player-seats"></div>
        </div>
      </div>

      <!-- Bottom Section: My Hand + Action Panel -->
      <div class="bottom-section">
        <!-- My Hand -->
        <div id="my-hand" class="my-hand"></div>

        <!-- Action Controls -->
        <div id="action-panel" class="action-panel hidden">
          <div class="action-buttons">
            <button id="btn-fold" class="btn btn-danger action-btn">弃牌</button>
            <button id="btn-check" class="btn btn-secondary action-btn hidden">过牌</button>
            <button id="btn-call" class="btn btn-secondary action-btn hidden">
              跟注 <span id="call-amount"></span>
            </button>
            <button id="btn-raise" class="btn btn-primary action-btn">
              加注
            </button>
            <button id="btn-allin" class="btn btn-primary action-btn allin-btn">全下</button>
          </div>
          <div class="raise-controls hidden" id="raise-controls">
            <input type="range" id="raise-slider" class="raise-slider" min="0" max="1000" value="20">
            <span id="raise-value" class="raise-value">20</span>
            <div class="raise-presets">
              <button class="btn btn-small raise-preset" data-mult="0.5">½ 底池</button>
              <button class="btn btn-small raise-preset" data-mult="1">底池</button>
              <button class="btn btn-small raise-preset" data-mult="2">2× 底池</button>
            </div>
          </div>
          <!-- Timer -->
          <div id="turn-timer" class="turn-timer hidden">
            <div id="timer-bar" class="timer-bar"></div>
            <span id="timer-text" class="timer-text"></span>
          </div>
        </div>
      </div>

      <!-- Game Result Overlay -->
      <div id="game-result" class="game-result-overlay hidden">
        <div class="result-panel panel animate-fade-in">
          <h2 id="result-title" class="result-title"></h2>
          <div id="result-hands" class="result-hands"></div>
          <button id="btn-next-round" class="btn btn-primary">下一局</button>
        </div>
      </div>

      <!-- Hand Rankings Help Modal -->
      <div id="hand-rankings-modal" class="modal-overlay hidden">
        <div class="modal-panel panel animate-fade-in">
          <div class="modal-header">
            <h2 class="text-gold">🃏 牌型大小</h2>
            <button id="btn-close-help" class="btn-icon modal-close">✕</button>
          </div>
          <div class="hand-rankings-list">
            <div class="ranking-item"><span class="ranking-num">1</span><span class="ranking-name">皇家同花顺</span><span class="ranking-desc">A K Q J 10 同花色</span></div>
            <div class="ranking-item"><span class="ranking-num">2</span><span class="ranking-name">同花顺</span><span class="ranking-desc">五张连续同花色</span></div>
            <div class="ranking-item"><span class="ranking-num">3</span><span class="ranking-name">四条</span><span class="ranking-desc">四张相同点数</span></div>
            <div class="ranking-item"><span class="ranking-num">4</span><span class="ranking-name">葫芦</span><span class="ranking-desc">三条 + 一对</span></div>
            <div class="ranking-item"><span class="ranking-num">5</span><span class="ranking-name">同花</span><span class="ranking-desc">五张相同花色</span></div>
            <div class="ranking-item"><span class="ranking-num">6</span><span class="ranking-name">顺子</span><span class="ranking-desc">五张连续点数</span></div>
            <div class="ranking-item"><span class="ranking-num">7</span><span class="ranking-name">三条</span><span class="ranking-desc">三张相同点数</span></div>
            <div class="ranking-item"><span class="ranking-num">8</span><span class="ranking-name">两对</span><span class="ranking-desc">两组对子</span></div>
            <div class="ranking-item"><span class="ranking-num">9</span><span class="ranking-name">一对</span><span class="ranking-desc">两张相同点数</span></div>
            <div class="ranking-item"><span class="ranking-num">10</span><span class="ranking-name">高牌</span><span class="ranking-desc">无任何组合</span></div>
          </div>
          <p class="ranking-footer">从上到下牌力递减，排名靠前的牌型更大</p>
        </div>
      </div>
    </div>
  `;

  // ---- Initial Render ----
  updateGameDisplay(currentState);

  // ---- Socket Events ----
  socket.on('game-state', (state) => {
    currentState = state;
    updateGameDisplay(state);
  });

  socket.on('deal-hand', ({ hand }) => {
    myHand = hand;
    renderMyHand(hand);
  });

  socket.on('game-result', ({ winners, hands, communityCards }) => {
    showdownHands = hands;
    showGameResult(winners, hands);
  });

  socket.on('turn-timer', ({ playerId, duration }) => {
    if (playerId === socket.id) {
      startTimer(duration);
    }
  });

  socket.on('room-update', (updatedRoom) => {
    currentRoom = updatedRoom;
  });

  socket.on('game-ended', () => {
    alert('游戏结束 - 没有足够的玩家继续');
    navigateTo('lobby');
  });

  socket.on('chat-message', ({ name, message }) => {
    showToast(`${name}: ${message}`);
  });

  // ---- Action Buttons ----
  document.getElementById('btn-fold').addEventListener('click', () => sendAction('fold'));
  document.getElementById('btn-check').addEventListener('click', () => sendAction('check'));
  document.getElementById('btn-call').addEventListener('click', () => sendAction('call'));
  document.getElementById('btn-allin').addEventListener('click', () => sendAction('allin'));

  document.getElementById('btn-raise').addEventListener('click', () => {
    const controls = document.getElementById('raise-controls');
    controls.classList.toggle('hidden');
    if (!controls.classList.contains('hidden')) {
      const slider = document.getElementById('raise-slider');
      sendAction('raise', parseInt(slider.value));
    }
  });

  const slider = document.getElementById('raise-slider');
  slider.addEventListener('input', () => {
    document.getElementById('raise-value').textContent = slider.value;
  });

  document.querySelectorAll('.raise-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const mult = parseFloat(btn.dataset.mult);
      const potAmount = currentState.pot || 0;
      const value = Math.max(currentState.currentBet * 2, Math.floor(potAmount * mult));
      slider.value = value;
      document.getElementById('raise-value').textContent = value;
    });
  });

  document.getElementById('btn-next-round').addEventListener('click', () => {
    document.getElementById('game-result').classList.add('hidden');
    socket.emit('next-round', (res) => {
      if (!res.success) alert(res.error);
    });
  });

  document.getElementById('btn-leave-game').addEventListener('click', () => {
    cleanupListeners();
    socket.emit('leave-room', () => navigateTo('lobby'));
  });

  // ---- Hand Rankings Help ----
  document.getElementById('btn-help').addEventListener('click', () => {
    document.getElementById('hand-rankings-modal').classList.remove('hidden');
  });
  document.getElementById('btn-close-help').addEventListener('click', () => {
    document.getElementById('hand-rankings-modal').classList.add('hidden');
  });
  document.getElementById('hand-rankings-modal').addEventListener('click', (e) => {
    if (e.target.id === 'hand-rankings-modal') {
      document.getElementById('hand-rankings-modal').classList.add('hidden');
    }
  });

  // ---- Display Functions ----

  function updateGameDisplay(state) {
    const phaseEl = document.getElementById('game-phase');
    const phaseNames = {
      preflop: '翻牌前', flop: '翻牌', turn: '转牌',
      river: '河牌', showdown: '摊牌'
    };
    phaseEl.textContent = phaseNames[state.phase] || state.phase;

    document.getElementById('pot-amount').textContent = `$${state.pot}`;
    renderCommunityCards(state.communityCards);
    renderPlayerSeats(state);
    updateActionPanel(state);
  }

  function renderCommunityCards(cards) {
    const el = document.getElementById('community-cards');
    if (!cards || cards.length === 0) {
      el.innerHTML = '<div class="card-placeholder"></div>'.repeat(5);
      return;
    }

    el.innerHTML = cards.map((card, i) => `
      <div class="card card-face animate-deal" style="animation-delay: ${i * 0.1}s">
        <span class="card-rank ${getCardColor(card.suit)}">${card.rank}</span>
        <span class="card-suit ${getCardColor(card.suit)}">${getSuitSymbol(card.suit)}</span>
      </div>
    `).join('') + '<div class="card-placeholder"></div>'.repeat(5 - cards.length);
  }

  function renderMyHand(hand) {
    const el = document.getElementById('my-hand');
    if (!hand || hand.length === 0) {
      el.innerHTML = '';
      return;
    }
    el.innerHTML = hand.map(card => `
      <div class="card card-face card-large">
        <span class="card-rank ${getCardColor(card.suit)}">${card.rank}</span>
        <span class="card-suit ${getCardColor(card.suit)}">${getSuitSymbol(card.suit)}</span>
      </div>
    `).join('');
  }

  function renderPlayerSeats(state) {
    const el = document.getElementById('player-seats');
    const totalPlayers = state.players.length;

    el.innerHTML = state.players.map((player, i) => {
      const ps = state.playerStates.find(p => p.id === player.id);
      const isMe = player.id === socket.id;
      const isCurrent = state.currentPlayerId === player.id;
      const isDealer = i === state.dealerIndex;
      const isFolded = ps?.status === 'folded';
      const isAllIn = ps?.status === 'allin';
      const seatAngle = getSeatPosition(i, totalPlayers);

      let handDisplay = '';
      if (showdownHands[player.id] && state.phase === 'showdown') {
        handDisplay = showdownHands[player.id].map(c =>
          `<div class="card card-mini ${getCardColor(c.suit)}">${c.rank}${getSuitSymbol(c.suit)}</div>`
        ).join('');
      }

      return `
        <div class="seat seat-${i} ${isCurrent ? 'active-turn' : ''} ${isFolded ? 'folded' : ''} ${isMe ? 'is-me' : ''}"
             style="--seat-x: ${seatAngle.x}%; --seat-y: ${seatAngle.y}%;">
          ${isDealer ? '<div class="dealer-btn">D</div>' : ''}
          <div class="seat-avatar">${player.isAI ? '🤖' : (isMe ? '😎' : '🎮')}</div>
          <div class="seat-name">${player.name}</div>
          <div class="seat-chips">$${player.chips}</div>
          ${ps?.bet > 0 ? `<div class="seat-bet">$${ps.bet}</div>` : ''}
          ${isAllIn ? '<div class="seat-allin">全下</div>' : ''}
          ${isFolded ? '<div class="seat-folded">弃牌</div>' : ''}
          ${handDisplay ? `<div class="seat-hand">${handDisplay}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  function updateActionPanel(state) {
    const panel = document.getElementById('action-panel');
    const isMyTurn = state.currentPlayerId === socket.id && state.phase !== 'showdown';

    if (!isMyTurn) {
      panel.classList.add('hidden');
      return;
    }

    panel.classList.remove('hidden');
    document.getElementById('raise-controls').classList.add('hidden');

    const myState = state.playerStates.find(ps => ps.id === socket.id);
    const myChips = state.players.find(p => p.id === socket.id)?.chips || 0;
    const toCall = state.currentBet - (myState?.bet || 0);

    const checkBtn = document.getElementById('btn-check');
    const callBtn = document.getElementById('btn-call');

    if (toCall <= 0) {
      checkBtn.classList.remove('hidden');
      callBtn.classList.add('hidden');
    } else {
      checkBtn.classList.add('hidden');
      callBtn.classList.remove('hidden');
      document.getElementById('call-amount').textContent = `$${Math.min(toCall, myChips)}`;
    }

    const sliderEl = document.getElementById('raise-slider');
    const minRaise = state.currentBet * 2 || 20;
    sliderEl.min = minRaise;
    sliderEl.max = myChips + (myState?.bet || 0);
    sliderEl.value = minRaise;
    document.getElementById('raise-value').textContent = minRaise;
  }

  function showGameResult(winners, hands) {
    const overlay = document.getElementById('game-result');
    const title = document.getElementById('result-title');
    const handsEl = document.getElementById('result-hands');

    const winnerNames = winners.map(w => `${w.name} 赢得 $${w.amount}`).join('，');
    title.innerHTML = `🏆 ${winnerNames}`;

    handsEl.innerHTML = winners.map(w => `
      <div class="result-winner">
        <span class="result-name text-gold">${w.name}</span>
        <span class="result-hand-name">${w.handName}</span>
        <span class="result-amount text-green">+$${w.amount}</span>
      </div>
    `).join('');

    if (hands && Object.keys(hands).length > 0) {
      handsEl.innerHTML += '<div class="result-divider"></div>';
      for (const [playerId, hand] of Object.entries(hands)) {
        const player = currentState.players.find(p => p.id === playerId);
        handsEl.innerHTML += `
          <div class="result-hand-row">
            <span>${player?.name || '未知'}</span>
            <div class="result-cards">
              ${hand.map(c => `<span class="card card-mini ${getCardColor(c.suit)}">${c.rank}${getSuitSymbol(c.suit)}</span>`).join(' ')}
            </div>
          </div>
        `;
      }
    }

    overlay.classList.remove('hidden');
  }

  function startTimer(duration) {
    clearInterval(timerInterval);
    const timerEl = document.getElementById('turn-timer');
    const barEl = document.getElementById('timer-bar');
    const textEl = document.getElementById('timer-text');
    timerEl.classList.remove('hidden');

    const start = Date.now();
    timerInterval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, duration - elapsed);
      const pct = (remaining / duration) * 100;

      barEl.style.width = `${pct}%`;
      barEl.className = `timer-bar ${pct < 33 ? 'timer-danger' : pct < 66 ? 'timer-warn' : ''}`;
      textEl.textContent = `${Math.ceil(remaining / 1000)}秒`;

      if (remaining <= 0) {
        clearInterval(timerInterval);
        timerEl.classList.add('hidden');
      }
    }, 100);
  }

  function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast animate-fade-in';
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  function sendAction(type, amount) {
    clearInterval(timerInterval);
    document.getElementById('turn-timer')?.classList.add('hidden');
    document.getElementById('action-panel')?.classList.add('hidden');
    socket.emit('player-action', { type, amount }, (res) => {
      if (!res.success) {
        showToast(`错误: ${res.error}`);
        document.getElementById('action-panel')?.classList.remove('hidden');
      }
    });
  }

  function cleanupListeners() {
    clearInterval(timerInterval);
    socket.off('game-state');
    socket.off('deal-hand');
    socket.off('game-result');
    socket.off('turn-timer');
    socket.off('room-update');
    socket.off('game-ended');
    socket.off('chat-message');
  }

  // ---- Utility ----

  function getSuitSymbol(suit) {
    return { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' }[suit] || suit;
  }

  function getCardColor(suit) {
    return (suit === 'hearts' || suit === 'diamonds') ? 'card-red' : 'card-black';
  }

  function getSeatPosition(index, total) {
    const positions = {
      2: [{ x: 50, y: 95 }, { x: 50, y: 5 }],
      3: [{ x: 50, y: 95 }, { x: 10, y: 30 }, { x: 90, y: 30 }],
      4: [{ x: 50, y: 95 }, { x: 5, y: 50 }, { x: 50, y: 5 }, { x: 95, y: 50 }],
      5: [{ x: 50, y: 95 }, { x: 5, y: 65 }, { x: 15, y: 10 }, { x: 85, y: 10 }, { x: 95, y: 65 }],
      6: [{ x: 50, y: 95 }, { x: 5, y: 65 }, { x: 10, y: 15 }, { x: 50, y: 5 }, { x: 90, y: 15 }, { x: 95, y: 65 }],
      7: [{ x: 50, y: 95 }, { x: 5, y: 70 }, { x: 5, y: 30 }, { x: 25, y: 5 }, { x: 75, y: 5 }, { x: 95, y: 30 }, { x: 95, y: 70 }],
      8: [{ x: 50, y: 95 }, { x: 5, y: 75 }, { x: 5, y: 40 }, { x: 20, y: 5 }, { x: 50, y: 5 }, { x: 80, y: 5 }, { x: 95, y: 40 }, { x: 95, y: 75 }],
      9: [{ x: 50, y: 95 }, { x: 5, y: 78 }, { x: 5, y: 45 }, { x: 15, y: 10 }, { x: 38, y: 5 }, { x: 62, y: 5 }, { x: 85, y: 10 }, { x: 95, y: 45 }, { x: 95, y: 78 }],
    };

    const key = Math.min(Math.max(total, 2), 9);
    return positions[key]?.[index] || { x: 50, y: 50 };
  }
});
