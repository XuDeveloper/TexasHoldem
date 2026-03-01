# In-Game Chat and Activity Log Design

## 1. Goal Description
The objective is to implement an in-game "Chat and Activity Log" drawer on the Texas Hold'em game interface. This drawer will allow players to communicate via text and quick-response phrases while concurrently displaying a timeline of game events (bets, folds, phase changes) generated locally by the frontend. 

The user has approved **Approach 1**: The backend will remain entirely untouched. The frontend will diff the `game-state` WebSocket events to synthesize English log entries, interleaving them with `chat-message` events broadcasted by `SocketHandler.js`. The drawer will be toggled by a floating action button on the right edge of the table.

## 2. Proposed UI Architecture

### 2.1 The Chat Toggle (Floating Action Button)
- **Positioning**: Fixed to the mid-right edge of the viewport (`right: 20px; top: 50%`).
- **Styling**: `width: 50px; height: 50px; border-radius: 50%;` styled to match the dark-theme aesthetic (dark gray background, gold icon).
- **Badge**: A small red notification dot with a numeric counter (`<span class="badge"></span>`) will appear when the drawer is closed and unread messages accumulate. 

### 2.2 The Slide-Out Drawer
- **Container**: `width: 320px; height: 100vh; position: fixed; right: -320px; transition: right 0.3s ease;`
- **Layout**:
  - **Header**: "🗨️ Game Chat" title and a "Close Drawer" (X) button.
  - **Message List**: A scrollable `<ul>` filling the remaining vertical space. 
    - **Chat Bubbles**: Sent by players. Dark background bounded elements.
    - **System Logs**: Small, centered, italicized gray text describing events (e.g., *Alice raised to 50*, *Flop revealed*).
  - **Quick Replies**: A horizontally scrollable row of small chips.
    1. "Nice hand!"
    2. "Hurry up!"
    3. "Are you bluffing?"
    4. "All in time 🔥"
  - **Input Area**: A standard text input and a "Send" button.

## 3. Proposed Logic and Integration (Frontend Only)

### 3.1 `client/pages/game.js`
- **State Tracking**: We will maintain a global `previousGameState` object to compare against the incoming `gameState` payload. 
- **Log Generator Diffs**:
  - **Phase changes**: `if (previousGameState.phase !== gameState.phase)` → `[System] The Flop has been dealt.`
  - **Action diffs**: `if (previousGameState.lastAction !== gameState.lastAction)` → `[System] Bob ${action.type}.`
  - **Winner broadcast**: `if (gameState.winners)` → `[System] Charlie won the pot.`
- **Chat Transmission**: Bind the "Send" button and Quick Reply chips to `socket.emit('chat-message', { message: text })`. 
- **Chat Reception**: Bind `socket.on('chat-message', (data))` to append a styled list item and increment the unread badge if the drawer is closed.

### 3.2 `client/style.css`
- Add all required classes (`.chat-drawer`, `.chat-fab`, `.chat-message`, `.system-log`, `.quick-reply-chip`, `.unread-badge`).

## 4. Verification Plan
1. Send arbitrary text using the text input and verify it broadcasts to the UI immediately.
2. Click a "Quick Reply" chip and confirm it behaves identically to typing the phrase.
3. Advance a game round locally between an AI and the Player and verify that `[System]` logs correctly populate the scrollback history describing the events accurately without duplicates.
4. Keep the drawer closed while the AI acts or another tab sends a message to verify the red notification badge increments correctly.
