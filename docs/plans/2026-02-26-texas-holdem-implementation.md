# Texas Hold'em Online Poker - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a real-time online Texas Hold'em poker website where friends create/join private rooms and play with each other or AI opponents.

**Architecture:** Vite SPA frontend communicating with a Node.js + Express + Socket.io backend. All game logic runs server-side. In-memory storage for rooms and game state.

**Tech Stack:** Vite, HTML/CSS/JS (vanilla), Node.js, Express, Socket.io, Vitest (testing)

**Design Doc:** [2026-02-26-texas-holdem-design.md](file:///Users/zhaoxuzhang/Desktop/Project/TexasHoldem/docs/plans/2026-02-26-texas-holdem-design.md)

---

## Task Overview

| Task | Component | Description |
|------|-----------|-------------|
| 1 | Project Setup | Initialize Vite + Node.js project, install dependencies |
| 2 | Card & Deck | Core card/deck data structures and shuffle logic |
| 3 | Hand Evaluator | Poker hand ranking and comparison |
| 4 | Game Engine | Core round flow: deal, bet, advance phases, showdown |
| 5 | Pot & Side Pot | Pot management including side pots for all-ins |
| 6 | Room Manager | Room CRUD, join/leave, host transfer |
| 7 | Socket.io Server | WebSocket event wiring, server entry point |
| 8 | AI Player | Simple rule-based AI logic |
| 9 | Frontend: Lobby | Home page, create/join room UI |
| 10 | Frontend: Room Waiting | Room waiting page, player list, host controls |
| 11 | Frontend: Game Table | Poker table UI, card rendering, player positions |
| 12 | Frontend: Actions & Timer | Bet controls, action buttons, countdown timer |
| 13 | Frontend: Animations | Card dealing, chip, winner animations |
| 14 | Integration & Polish | End-to-end testing, bug fixes, visual polish |

---

### Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `server/index.js`
- Create: `client/index.html`
- Create: `client/main.js`
- Create: `client/style.css`
- Create: `vite.config.js`

**Step 1: Initialize Node.js project**

```bash
cd /Users/zhaoxuzhang/Desktop/Project/TexasHoldem
npm init -y
```

**Step 2: Install dependencies**

```bash
npm install express socket.io
npm install -D vite vitest
```

**Step 3: Create project structure**

```bash
mkdir -p server client tests
```

**Step 4: Create `vite.config.js`**

```javascript
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'client',
  build: {
    outDir: '../dist',
  },
  server: {
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
});
```

**Step 5: Create minimal `server/index.js`**

```javascript
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Step 6: Create minimal `client/index.html` and `client/main.js`**

Basic HTML shell with casino-themed background, Socket.io client connection.

**Step 7: Add scripts to `package.json`**

```json
{
  "type": "module",
  "scripts": {
    "dev:client": "vite",
    "dev:server": "node --watch server/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

**Step 8: Verify setup**

```bash
# Terminal 1
npm run dev:server
# Terminal 2
npm run dev:client
# Open browser, verify Socket.io connects (check console logs)
```

**Step 9: Commit**

```bash
git add -A && git commit -m "chore: project setup with Vite + Node.js + Socket.io"
```

---

### Task 2: Card & Deck Module

**Files:**
- Create: `server/game/Card.js`
- Create: `server/game/Deck.js`
- Create: `tests/Card.test.js`
- Create: `tests/Deck.test.js`

**Step 1: Write failing tests for Card**

```javascript
// tests/Card.test.js
import { describe, it, expect } from 'vitest';
import { Card, SUITS, RANKS } from '../server/game/Card.js';

describe('Card', () => {
  it('creates a card with suit and rank', () => {
    const card = new Card('hearts', 'A');
    expect(card.suit).toBe('hearts');
    expect(card.rank).toBe('A');
  });

  it('returns correct numeric value', () => {
    expect(new Card('hearts', '2').value).toBe(2);
    expect(new Card('hearts', 'A').value).toBe(14);
    expect(new Card('hearts', 'K').value).toBe(13);
  });

  it('has correct string representation', () => {
    expect(new Card('hearts', 'A').toString()).toBe('A♥');
  });

  it('exports 4 suits and 13 ranks', () => {
    expect(SUITS).toHaveLength(4);
    expect(RANKS).toHaveLength(13);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run tests/Card.test.js
```
Expected: FAIL

**Step 3: Implement `server/game/Card.js`**

```javascript
export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const SUIT_SYMBOLS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const RANK_VALUES = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };

export class Card {
  constructor(suit, rank) {
    this.suit = suit;
    this.rank = rank;
  }

  get value() {
    return RANK_VALUES[this.rank];
  }

  toString() {
    return `${this.rank}${SUIT_SYMBOLS[this.suit]}`;
  }

  toJSON() {
    return { suit: this.suit, rank: this.rank };
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run tests/Card.test.js
```
Expected: PASS

**Step 5: Write failing tests for Deck**

```javascript
// tests/Deck.test.js
import { describe, it, expect } from 'vitest';
import { Deck } from '../server/game/Deck.js';

describe('Deck', () => {
  it('creates a 52-card deck', () => {
    const deck = new Deck();
    expect(deck.remaining).toBe(52);
  });

  it('deals cards reducing count', () => {
    const deck = new Deck();
    const card = deck.deal();
    expect(card).toBeDefined();
    expect(deck.remaining).toBe(51);
  });

  it('deals multiple cards', () => {
    const deck = new Deck();
    const cards = deck.dealMany(5);
    expect(cards).toHaveLength(5);
    expect(deck.remaining).toBe(47);
  });

  it('shuffles the deck', () => {
    const deck1 = new Deck();
    const deck2 = new Deck();
    deck2.shuffle();
    // After shuffle, very unlikely to have same order
    const cards1 = deck1.dealMany(52).map(c => c.toString());
    const cards2 = deck2.dealMany(52).map(c => c.toString());
    expect(cards1).not.toEqual(cards2);
  });

  it('all 52 cards are unique', () => {
    const deck = new Deck();
    deck.shuffle();
    const cards = deck.dealMany(52).map(c => c.toString());
    expect(new Set(cards).size).toBe(52);
  });
});
```

**Step 6: Run, verify fail, implement `server/game/Deck.js`, run, verify pass**

**Step 7: Commit**

```bash
git add -A && git commit -m "feat: add Card and Deck modules with tests"
```

---

### Task 3: Hand Evaluator

**Files:**
- Create: `server/game/HandEvaluator.js`
- Create: `tests/HandEvaluator.test.js`

This is the most complex piece of game logic. The evaluator takes 7 cards (2 hole + 5 community) and returns the best 5-card poker hand with a rank for comparison.

**Step 1: Write comprehensive failing tests**

```javascript
// tests/HandEvaluator.test.js
import { describe, it, expect } from 'vitest';
import { evaluateHand, compareHands, HandRank } from '../server/game/HandEvaluator.js';
import { Card } from '../server/game/Card.js';

const c = (rank, suit) => new Card(suit, rank);

describe('HandEvaluator', () => {
  it('detects royal flush', () => {
    const cards = [c('A','hearts'), c('K','hearts'), c('Q','hearts'), c('J','hearts'), c('10','hearts'), c('2','clubs'), c('3','diamonds')];
    expect(evaluateHand(cards).rank).toBe(HandRank.ROYAL_FLUSH);
  });

  it('detects straight flush', () => {
    const cards = [c('9','hearts'), c('8','hearts'), c('7','hearts'), c('6','hearts'), c('5','hearts'), c('2','clubs'), c('3','diamonds')];
    expect(evaluateHand(cards).rank).toBe(HandRank.STRAIGHT_FLUSH);
  });

  it('detects four of a kind', () => {
    const cards = [c('A','hearts'), c('A','diamonds'), c('A','clubs'), c('A','spades'), c('K','hearts'), c('2','clubs'), c('3','diamonds')];
    expect(evaluateHand(cards).rank).toBe(HandRank.FOUR_OF_A_KIND);
  });

  it('detects full house', () => {
    const cards = [c('A','hearts'), c('A','diamonds'), c('A','clubs'), c('K','spades'), c('K','hearts'), c('2','clubs'), c('3','diamonds')];
    expect(evaluateHand(cards).rank).toBe(HandRank.FULL_HOUSE);
  });

  it('detects flush', () => {
    const cards = [c('A','hearts'), c('K','hearts'), c('9','hearts'), c('7','hearts'), c('4','hearts'), c('2','clubs'), c('3','diamonds')];
    expect(evaluateHand(cards).rank).toBe(HandRank.FLUSH);
  });

  it('detects straight', () => {
    const cards = [c('9','hearts'), c('8','diamonds'), c('7','clubs'), c('6','spades'), c('5','hearts'), c('2','clubs'), c('3','diamonds')];
    expect(evaluateHand(cards).rank).toBe(HandRank.STRAIGHT);
  });

  it('detects A-2-3-4-5 wheel straight', () => {
    const cards = [c('A','hearts'), c('2','diamonds'), c('3','clubs'), c('4','spades'), c('5','hearts'), c('9','clubs'), c('K','diamonds')];
    expect(evaluateHand(cards).rank).toBe(HandRank.STRAIGHT);
  });

  it('detects three of a kind', () => {
    const cards = [c('A','hearts'), c('A','diamonds'), c('A','clubs'), c('K','spades'), c('9','hearts'), c('2','clubs'), c('3','diamonds')];
    expect(evaluateHand(cards).rank).toBe(HandRank.THREE_OF_A_KIND);
  });

  it('detects two pair', () => {
    const cards = [c('A','hearts'), c('A','diamonds'), c('K','clubs'), c('K','spades'), c('9','hearts'), c('2','clubs'), c('3','diamonds')];
    expect(evaluateHand(cards).rank).toBe(HandRank.TWO_PAIR);
  });

  it('detects one pair', () => {
    const cards = [c('A','hearts'), c('A','diamonds'), c('K','clubs'), c('9','spades'), c('7','hearts'), c('2','clubs'), c('3','diamonds')];
    expect(evaluateHand(cards).rank).toBe(HandRank.ONE_PAIR);
  });

  it('detects high card', () => {
    const cards = [c('A','hearts'), c('K','diamonds'), c('9','clubs'), c('7','spades'), c('4','hearts'), c('2','clubs'), c('3','diamonds')];
    expect(evaluateHand(cards).rank).toBe(HandRank.HIGH_CARD);
  });

  it('compareHands: higher rank wins', () => {
    const flush = [c('A','hearts'), c('K','hearts'), c('9','hearts'), c('7','hearts'), c('4','hearts'), c('2','clubs'), c('3','diamonds')];
    const pair = [c('A','hearts'), c('A','diamonds'), c('K','clubs'), c('9','spades'), c('7','hearts'), c('2','clubs'), c('3','diamonds')];
    expect(compareHands(evaluateHand(flush), evaluateHand(pair))).toBeGreaterThan(0);
  });

  it('compareHands: same rank, kicker decides', () => {
    const pairA = [c('A','hearts'), c('A','diamonds'), c('K','clubs'), c('9','spades'), c('7','hearts'), c('2','clubs'), c('3','diamonds')];
    const pairK = [c('K','hearts'), c('K','diamonds'), c('Q','clubs'), c('9','spades'), c('7','hearts'), c('2','clubs'), c('3','diamonds')];
    expect(compareHands(evaluateHand(pairA), evaluateHand(pairK))).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test, verify fail**

```bash
npx vitest run tests/HandEvaluator.test.js
```

**Step 3: Implement `server/game/HandEvaluator.js`**

Implement hand evaluation logic:
- Generate all 21 possible 5-card combinations from 7 cards
- Evaluate each 5-card hand for rank (Royal Flush → High Card)
- Return best hand with rank and kicker values for comparison
- `compareHands(a, b)` returns positive if a wins, negative if b wins, 0 for tie

**Step 4: Run tests, verify pass**

```bash
npx vitest run tests/HandEvaluator.test.js
```

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add hand evaluator with comprehensive tests"
```

---

### Task 4: Game Engine

**Files:**
- Create: `server/game/GameEngine.js`
- Create: `tests/GameEngine.test.js`

**Step 1: Write failing tests**

Test the core round flow:
- `startRound()` — deals hands, posts blinds, sets phase to preflop
- `handleAction(playerId, action)` — processes fold/call/raise/check/allin
- Phase advancement: preflop → flop → turn → river → showdown
- Proper turn rotation (skip folded/allin players)
- Showdown logic with winner determination

**Step 2: Run tests, verify fail**

```bash
npx vitest run tests/GameEngine.test.js
```

**Step 3: Implement `server/game/GameEngine.js`**

Key methods:
- `constructor(players)` — initialize game state
- `startRound()` — shuffle deck, deal 2 cards each, post blinds
- `handleAction(playerId, { type, amount })` — validate and process action
- `advancePhase()` — deal community cards, reset round bets
- `determineWinners()` — evaluate hands, distribute pot
- `getStateForPlayer(playerId)` — return sanitized state (hide other hands)

**Step 4: Run tests, verify pass**

```bash
npx vitest run tests/GameEngine.test.js
```

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add game engine with round flow logic"
```

---

### Task 5: Pot & Side Pot Calculator

**Files:**
- Create: `server/game/PotManager.js`
- Create: `tests/PotManager.test.js`

**Step 1: Write failing tests**

```javascript
// Test cases:
// - Simple pot: all players bet same amount
// - One all-in with less chips: creates side pot
// - Multiple all-ins at different amounts: creates multiple side pots
// - Correct distribution of winnings from each pot
```

**Step 2-4: Run fail, implement, run pass**

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add pot manager with side pot calculation"
```

---

### Task 6: Room Manager

**Files:**
- Create: `server/RoomManager.js`
- Create: `tests/RoomManager.test.js`

**Step 1: Write failing tests**

Test room lifecycle:
- `createRoom(hostId, hostName)` — returns room with 6-char code
- `joinRoom(code, playerId, playerName)` — adds player
- `removePlayer(code, playerId)` — removes player, transfers host if needed
- `addAI(code)` — adds AI player
- Validation: max 9 players, room exists, duplicate names

**Step 2-4: Implement and test**

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add room manager with join/leave/host-transfer"
```

---

### Task 7: Socket.io Server & Event Wiring

**Files:**
- Modify: `server/index.js`
- Create: `server/SocketHandler.js`

**Step 1: Create `SocketHandler.js`**

Wire Socket.io events to RoomManager and GameEngine:
- `create-room` / `join-room` / `add-ai` / `start-game` → RoomManager
- `player-action` → GameEngine
- `chat-message` → broadcast to room
- Emit `room-update`, `game-state`, `deal-hand`, `game-result`
- Handle disconnect with 60s reconnection window

**Step 2: Update `server/index.js` to use SocketHandler**

**Step 3: Manual test — open 2 browser tabs, create/join room**

```bash
npm run dev:server  # Terminal 1
npm run dev:client  # Terminal 2
# Open two browser tabs, create room in one, join in the other
```

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add Socket.io event handling and server wiring"
```

---

### Task 8: AI Player

**Files:**
- Create: `server/game/AIPlayer.js`
- Create: `tests/AIPlayer.test.js`

**Step 1: Write failing tests**

Test AI decision making:
- Folds with very bad hand (low disconnected cards)
- Calls with decent hand
- Raises with strong hand (top pair or better)
- All-in with very strong hand
- Respects game rules (doesn't raise more than it has)

**Step 2-4: Implement simple rule-based AI**

Decision logic (v1 simple):
- Evaluate hand strength (pair, two pair, etc.) using HandEvaluator on available cards
- Pre-flop: play based on starting hand chart (premium/strong/medium/weak)
- Post-flop: play based on made hand strength
- Add small random factor for unpredictability

**Step 5: Integrate AI into GameEngine (AI acts automatically when it's their turn)**

**Step 6: Commit**

```bash
git add -A && git commit -m "feat: add simple rule-based AI player"
```

---

### Task 9: Frontend — Lobby Page

**Files:**
- Modify: `client/index.html`
- Modify: `client/style.css`
- Create: `client/pages/lobby.js`
- Create: `client/socket.js`

**Step 1: Set up Socket.io client wrapper in `client/socket.js`**

**Step 2: Build lobby page**

- Casino-themed background (dark green/gold)
- Game logo and title ("Texas Hold'em Poker")
- Nickname input field
- "Create Room" and "Join Room" buttons
- Room code input (shown when "Join Room" clicked)
- Google Fonts: Playfair Display + Inter

**Step 3: Wire up Socket.io events**

- `create-room` → navigate to waiting room
- `join-room` → navigate to waiting room
- Error handling (room not found, name taken, room full)

**Step 4: Visual verification in browser**

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add lobby page with casino theme"
```

---

### Task 10: Frontend — Room Waiting Page

**Files:**
- Create: `client/pages/room.js`
- Modify: `client/style.css`

**Step 1: Build room waiting UI**

- Large room code display with copy-to-clipboard button
- Player list (avatar placeholder + name + ready indicator)
- Host controls: "Add AI" button, "Start Game" button
- Chat panel (simple message list + input)
- Casino-styled card with gold borders

**Step 2: Wire Socket.io events**

- Listen for `room-update` to refresh player list
- `add-ai` / `start-game` buttons for host
- Navigate to game table on game start

**Step 3: Visual verification**

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add room waiting page with host controls"
```

---

### Task 11: Frontend — Game Table

**Files:**
- Create: `client/pages/game.js`
- Create: `client/components/table.js`
- Create: `client/components/card.js`
- Create: `client/components/player.js`
- Modify: `client/style.css`

**Step 1: Build poker table layout**

- Oval green felt table with gold border (CSS)
- Player positions arranged around table (support 2-9 players)
- Community cards area (center-top)
- Pot display (center)
- Current player's hand (bottom)
- Dealer button indicator

**Step 2: Build card component**

- Card face: white background, suit symbol, rank
- Card back: classic red/blue pattern
- CSS for card layout and sizing

**Step 3: Build player component**

- Name, chip count, current bet
- Active player highlight (glowing border)
- Folded state (grayed out)
- All-in indicator
- Connection status indicator

**Step 4: Wire `game-state` and `deal-hand` events**

- Render community cards as they're revealed
- Show own hand cards, hide others (show card backs)
- Update player chips and bets

**Step 5: Visual verification — play a round**

**Step 6: Commit**

```bash
git add -A && git commit -m "feat: add game table with cards and player positions"
```

---

### Task 12: Frontend — Action Controls & Timer

**Files:**
- Create: `client/components/actions.js`
- Create: `client/components/timer.js`
- Modify: `client/style.css`

**Step 1: Build action buttons**

- Fold / Call / Raise / Check / All-in buttons
- Raise slider with min/max bounds + quick-bet buttons (1/2 pot, pot, 2x pot)
- Buttons only active when it's player's turn
- Display call amount on button ("Call $20")

**Step 2: Build countdown timer**

- 30-second circular/linear progress bar
- Visual urgency (color change when < 10 seconds)
- Send action automatically on timeout

**Step 3: Wire `player-action` event**

**Step 4: Visual verification — complete a full round with actions**

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add action controls and turn timer"
```

---

### Task 13: Frontend — Animations & Polish

**Files:**
- Modify: `client/style.css`
- Modify: `client/components/card.js`
- Modify: `client/components/table.js`

**Step 1: Card dealing animation**

- Cards slide from deck position to player positions
- Community cards flip animation

**Step 2: Chip animations**

- Chips slide to pot on bet
- Pot slides to winner

**Step 3: Winner highlight**

- Winning hand cards glow/pulse
- Winner name flash
- Winning hand name displayed ("Full House, Aces over Kings")

**Step 4: Game result overlay**

- Show all hands at showdown
- Display winner and winning hand
- "Next Round" button

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add card dealing, chip, and winner animations"
```

---

### Task 14: Integration & Polish

**Files:**
- Various fixes across all files

**Step 1: End-to-end manual testing**

Open 3+ browser tabs, create room, add AI, play multiple rounds. Verify:
- [ ] Room creation and joining works
- [ ] AI players act correctly
- [ ] All betting rounds work (preflop → showdown)
- [ ] Side pots calculate correctly
- [ ] Disconnect/reconnect works
- [ ] Chat works
- [ ] Timer and auto-fold works
- [ ] Multiple rounds in sequence work
- [ ] Host transfer on host disconnect works

**Step 2: Bug fixes and edge cases**

**Step 3: Final visual polish**

- Verify responsive layout on different screen sizes
- Fine-tune animations and timing
- Ensure consistent casino theme throughout

**Step 4: Final commit**

```bash
git add -A && git commit -m "feat: integration testing and polish"
```

---

## Verification Plan

### Automated Tests

```bash
# Run all unit tests
npx vitest run

# Run specific test suites
npx vitest run tests/Card.test.js
npx vitest run tests/Deck.test.js
npx vitest run tests/HandEvaluator.test.js
npx vitest run tests/GameEngine.test.js
npx vitest run tests/PotManager.test.js
npx vitest run tests/RoomManager.test.js
npx vitest run tests/AIPlayer.test.js
```

Key test coverage areas:
- All 10 poker hand types correctly detected
- Hand comparison with kickers
- Side pot calculation with multiple all-ins
- Game phase transitions
- Room lifecycle (create, join, leave, host transfer)
- AI decision logic

### Manual Verification

1. **Multi-tab play test**: Open 3 browser tabs at `http://localhost:5173`. Create room in tab 1, join in tabs 2 and 3. Add 1 AI. Play a complete round. Verify all tabs show correct game state.

2. **Disconnect test**: During a game, close one tab. Verify the disconnected player's spot is held for 60 seconds and auto-fold/check happens on their turn.

3. **Visual inspection**: Verify casino theme (green felt, gold accents, proper fonts) renders correctly and animations play smoothly.
