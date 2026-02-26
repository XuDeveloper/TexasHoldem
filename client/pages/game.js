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
        <span class="game-room-code">Room: ${room.id}</span>
        <span class="game-phase" id="game-phase"></span>
        <button id="btn-leave-game" class="btn btn-danger btn-small">Leave</button>
      </div>

      <!-- Poker Table -->
      <div class="table-wrapper">
        <div class="poker-table">
          <div class="table-felt">
            <!-- Community Cards -->
            <div id="community-cards" class="community-cards"></div>
            <!-- Pot -->
            <div id="pot-display" class="pot-display">
              <span class="pot-label">POT</span>
              <span id="pot-amount" class="pot-amount">0</span>
            </div>
          </div>
          <!-- Player Seats -->
          <div id="player-seats" class="player-seats"></div>
        </div>
      </div>

      <!-- My Hand -->
      <div id="my-hand" class="my-hand"></div>

      <!-- Action Controls -->
      <div id="action-panel" class="action-panel hidden">
        <div class="action-buttons">
          <button id="btn-fold" class="btn btn-danger action-btn">Fold</button>
          <button id="btn-check" class="btn btn-secondary action-btn hidden">Check</button>
          <button id="btn-call" class="btn btn-secondary action-btn hidden">
            Call <span id="call-amount"></span>
          </button>
          <button id="btn-raise" class="btn btn-primary action-btn">
            Raise
          </button>
          <button id="btn-allin" class="btn btn-primary action-btn allin-btn">All-in</button>
        </div>
        <div class="raise-controls hidden" id="raise-controls">
          <input type="range" id="raise-slider" class="raise-slider" min="0" max="1000" value="20">
          <span id="raise-value" class="raise-value">20</span>
          <div class="raise-presets">
            <button class="btn btn-small raise-preset" data-mult="0.5">½ Pot</button>
            <button class="btn btn-small raise-preset" data-mult="1">Pot</button>
            <button class="btn btn-small raise-preset" data-mult="2">2× Pot</button>
          </div>
        </div>
        <!-- Timer -->
        <div id="turn-timer" class="turn-timer hidden">
          <div id="timer-bar" class="timer-bar"></div>
          <span id="timer-text" class="timer-text"></span>
        </div>
      </div>

      <!-- Game Result Overlay -->
      <div id="game-result" class="game-result-overlay hidden">
        <div class="result-panel panel animate-fade-in">
          <h2 id="result-title" class="result-title"></h2>
          <div id="result-hands" class="result-hands"></div>
          <button id="btn-next-round" class="btn btn-primary">Next Round</button>
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
        alert('Game ended - not enough players with chips');
        navigateTo('lobby');
    });

    socket.on('chat-message', ({ name, message }) => {
        // Simple chat toast
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

    // ---- Display Functions ----

    function updateGameDisplay(state) {
        // Phase
        const phaseEl = document.getElementById('game-phase');
        const phaseNames = {
            preflop: 'Pre-Flop', flop: 'Flop', turn: 'Turn',
            river: 'River', showdown: 'Showdown'
        };
        phaseEl.textContent = phaseNames[state.phase] || state.phase;

        // Pot
        document.getElementById('pot-amount').textContent = `$${state.pot}`;

        // Community cards
        renderCommunityCards(state.communityCards);

        // Player seats
        renderPlayerSeats(state);

        // Action panel
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

            // Show hand if in showdown and we have the data
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
          ${isAllIn ? '<div class="seat-allin">ALL IN</div>' : ''}
          ${isFolded ? '<div class="seat-folded">FOLD</div>' : ''}
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

        // Check or Call
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

        // Raise slider
        const slider = document.getElementById('raise-slider');
        const minRaise = state.currentBet * 2 || 20;
        slider.min = minRaise;
        slider.max = myChips + (myState?.bet || 0);
        slider.value = minRaise;
        document.getElementById('raise-value').textContent = minRaise;
    }

    function showGameResult(winners, hands) {
        const overlay = document.getElementById('game-result');
        const title = document.getElementById('result-title');
        const handsEl = document.getElementById('result-hands');

        const winnerNames = winners.map(w => `${w.name} wins $${w.amount}`).join(', ');
        title.innerHTML = `🏆 ${winnerNames}`;

        handsEl.innerHTML = winners.map(w => `
      <div class="result-winner">
        <span class="result-name text-gold">${w.name}</span>
        <span class="result-hand-name">${w.handName}</span>
        <span class="result-amount text-green">+$${w.amount}</span>
      </div>
    `).join('');

        // Show revealed hands
        if (hands && Object.keys(hands).length > 0) {
            handsEl.innerHTML += '<div class="result-divider"></div>';
            for (const [playerId, hand] of Object.entries(hands)) {
                const player = currentState.players.find(p => p.id === playerId);
                handsEl.innerHTML += `
          <div class="result-hand-row">
            <span>${player?.name || 'Unknown'}</span>
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
            textEl.textContent = `${Math.ceil(remaining / 1000)}s`;

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
                showToast(`Error: ${res.error}`);
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
        // Positions around an oval table
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
