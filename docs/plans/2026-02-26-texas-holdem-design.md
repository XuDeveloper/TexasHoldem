# Texas Hold'em Online Poker - Design Document

> **Created**: 2026-02-26  
> **Status**: Approved  
> **Goal**: Build an online Texas Hold'em poker website for friends to play together with real-time multiplayer and AI opponents.

## Overview

A web-based Texas Hold'em poker game focused on private room play with friends. Players create/join rooms via room codes, play real-time poker via WebSocket, and can fill empty seats with AI players. Classic casino visual style with dark green felt table and gold accents.

## Tech Stack

- **Frontend**: Vite + HTML/CSS/JS (vanilla, no framework)
- **Backend**: Node.js + Express + Socket.io
- **Storage**: In-memory (no database for v1)
- **Deployment**: Single Node.js server hosting both static files and WebSocket

## Architecture

```
┌─────────────────────────────────────────────┐
│                  Browser Client              │
│  Vite + HTML/CSS/JS                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │ Game View │ │ Lobby    │ │ Chat     │     │
│  └──────────┘ └──────────┘ └──────────┘     │
│         ↕ Socket.io Client                  │
└─────────────────────────────────────────────┘
                    ↕ WebSocket
┌─────────────────────────────────────────────┐
│                Node.js Backend               │
│  Express + Socket.io Server                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │ Room Mgr │ │ Game Eng │ │ AI Player│     │
│  └──────────┘ └──────────┘ └──────────┘     │
│                 In-Memory Store              │
└─────────────────────────────────────────────┘
```

### Key Decisions

- **No database** — In-memory storage, rooms cleared on restart
- **All game logic on backend** — Anti-cheat, clients only render and send actions
- **Room-based** — Create room → get 6-digit code → friends join with code
- **AI runs on backend** — Virtual socket connections, reuses same game logic

## Game Flow

### Room Lifecycle

```
Create Room → Wait for Players → Host Starts → Playing → Round End → Continue/Disband
```

1. Player enters nickname → creates room → gets 6-digit room code
2. Friends enter nickname + room code → join waiting lobby
3. Host can click "Add AI" to fill seats
4. Start requires min 2 players (including AI), max 9, host clicks "Start Game"

### Round Flow

```
Post Blinds → Deal Hole Cards (2) → Pre-flop Betting → Deal Flop (3) → Betting
→ Deal Turn (1) → Betting → Deal River (1) → Final Betting → Showdown
```

### Player Actions

- **Fold** — Abandon current round
- **Call** — Match current highest bet
- **Raise** — Custom amount via slider + quick buttons
- **All-in** — Push all remaining chips
- **Check** — Pass when no bet required

### Chip Settings

- Starting chips: **1000**
- Blinds: **5/10** (fixed, no escalation in v1)
- Bust players spectate, can "rebuy" next round

### Turn Timer

- **30 seconds** per action
- Timeout: auto-fold (auto-check if possible)
- Visual countdown progress bar

## Data Models

### Core Structures (Backend)

```javascript
Room {
  id: "ABC123",           // 6-digit room code
  hostId: "socket-id",    // Host player
  players: [Player],      // Up to 9
  status: "waiting|playing",
  game: Game | null
}

Player {
  id: "socket-id",
  name: "Alice",
  chips: 1000,
  isAI: false,
  isConnected: true
}

Game {
  deck: [Card],
  communityCards: [Card], // 0-5 cards
  pot: 200,
  sidePots: [],
  currentPlayerIndex: 2,
  dealerIndex: 0,
  phase: "preflop|flop|turn|river|showdown",
  playerStates: [PlayerState]
}

PlayerState {
  hand: [Card, Card],     // Private, server + owner only
  bet: 50,                // Current round bet
  totalBet: 100,          // Total this hand
  status: "active|folded|allin"
}

Card { suit: "hearts", rank: "A" }
```

### Socket.io Events

| Direction | Event | Description |
|-----------|-------|-------------|
| Client→Server | `create-room` | Create room |
| Client→Server | `join-room` | Join room |
| Client→Server | `add-ai` | Add AI player |
| Client→Server | `start-game` | Start game |
| Client→Server | `player-action` | Player action (fold/call/raise/check/allin) |
| Server→Client | `room-update` | Room state update |
| Server→Client | `game-state` | Game state push |
| Server→Client | `deal-hand` | Private hand cards |
| Server→Client | `game-result` | Round result |
| Server→All | `chat-message` | Chat message |

## Frontend Design

### Pages

1. **Home / Lobby** — Logo, nickname input, "Create Room" / "Join Room" buttons
2. **Room Waiting** — Room code display (copy button), player list, host controls
3. **Game Table** — Oval felt table, player positions, cards, action buttons

### Visual Style

- **Theme**: Classic casino — dark green felt + gold accents + dark wood
- **Colors**: Felt `#1a472a`, Gold `#d4af37`, Wood `#2c1810`
- **Fonts**: "Playfair Display" (headings) + "Inter" (body) from Google Fonts
- **Animations**: Card dealing slide, chip stacking, winner highlight flash
- **Responsive**: Desktop-first, mobile-usable

### Game Table Layout

- Oval green felt table centered on screen
- Players positioned around table perimeter (up to 9 seats)
- Community cards displayed center-top of table
- Pot amount shown in table center
- Current player's hand at bottom
- Action buttons fixed at bottom (active only on player's turn)
- Collapsible chat panel on right

## Error Handling & Edge Cases

### Disconnect Handling

- Mark player `isConnected: false`, hold seat for **60 seconds**
- Auto-fold/check during disconnect if turn comes
- Reconnect within 60s restores seat and chips
- After 60s, removed from room

### Edge Cases

| Scenario | Handling |
|----------|---------|
| Only 1 human left | Game continues (vs AI) |
| All humans leave | Room destroyed |
| Host leaves | Auto-transfer host to next human |
| Player quits mid-game | Auto-fold, round continues |
| Multiple all-ins | Side pot calculation |
| Concurrent actions | Backend serializes, ignores non-current player |

### Security (v1 minimal)

- No user registration/login, nickname only
- All game logic server-side, no client cheating
- Random unpredictable room codes

## Testing Strategy

- **Unit tests**: Hand evaluation, comparison logic, side pot calculation
- **Integration tests**: Full round automation
- **Manual tests**: Multi-browser window simulation
