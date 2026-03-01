# Texas Hold'em UI and AI Improvements Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement 4 distinct user requests: English UI translation, editable raise input, enforce multiples of 5 for bets, and add conservative AI personalities.

**Architecture:** 
1. UI strings in `client/pages/*.js` will be translated back to English.
2. The raise slider in `game.js` will be replaced/complemented by an HTML number input field.
3. Node server `GameEngine.js` will enforce bet/raise amounts to be multiples of 5, throwing errors otherwise.
4. AI generation in `RoomManager` will randomly assign a `personality` ("aggressive" or "conservative"). `AIPlayer.js` will use this property to drastically reduce bluffs/raises if conservative.

**Tech Stack:** Vanilla JS (Frontend), Node.js (Backend), WebSockets

---

### Task 1: English UI Translation

**Files:**
- Modify: `client/pages/lobby.js`
- Modify: `client/pages/room.js`
- Modify: `client/pages/game.js`
- Modify: `client/main.js` (if any alerts/toasts)

**Step 1: Translate Strings**
- Replace all Chinese strings with professional English equivalents:
    - "大厅" -> "Lobby", "房间" -> "Room", "创建房间" -> "Create Room", "加入房间" -> "Join Room"
    - "游戏阶段" -> "Game Phase", "玩家" -> "Players", "筹码" -> "Chips", "底池" -> "Pot"
    - "弃牌" -> "Fold", "过牌" -> "Check", "跟注" -> "Call", "加注" -> "Raise", "全下" -> "All-In"
    - "下一局" -> "Next Round", "等待房主开始游戏..." -> "Waiting for host to start...", etc.
    - Hand rankings: "皇家同花顺" -> "Royal Flush", etc.

### Task 2: Editable Raise Input and Mult-5 Constraint

**Files:**
- Modify: `client/pages/game.js`
- Modify: `server/game/GameEngine.js`

**Step 1: Update Frontend Control**
- In `game.js`, change the `.raise-controls` HTML:
```html
<div class="raise-controls hidden" id="raise-controls">
  <input type="number" id="raise-input" class="raise-input" min="5" step="5" value="20">
  <input type="range" id="raise-slider" class="raise-slider" min="5" max="1000" step="5" value="20">
```
- Sync both the slider and the input box so dragging one updates the other.
- When sending the action, grab the value from the input box.

**Step 2: Server-Side Enforcement**
- In `GameEngine.js` `handleAction(playerId, action)`, under `raise` case:
  - Add validation: `if (amount % 5 !== 0) throw new Error('Raise amount must be a multiple of 5');`
  - Under `call` case, if the calculation of `amount` produces a non-multiple of 5, allow it ONLY if it's matching a previous all-in, else enforce 5. (Wait, blinds are 5/10 so all normal bets will be % 5. Only all-ins can be weird numbers).

### Task 3: AI Personalities and Bet Rounding

**Files:**
- Modify: `server/RoomManager.js`
- Modify: `server/game/AIPlayer.js`

**Step 1: Assign Personality**
- In `RoomManager.js` `addAI(code)`:
  - `const personality = Math.random() > 0.5 ? 'aggressive' : 'conservative';`
  - Add to AI object: `personality`

**Step 2: Utilize Personality in AIPlayer**
- In `AIPlayer.js` `decideAction(..., playerId)`:
  - Fetch the player object directly to check `personality`: `const player = gameState.players.find(p => p.id === playerId); const isConservative = player && player.personality === 'conservative';`
  - If conservative: 
      - Halve the `random` value used for bluffs.
      - Never raise with `medium` or `weak` hands.
      - Fold marginal hands significantly more often (e.g., if `random < 0.6` instead of `0.2`).
- Check all `amount` math in `AIPlayer.js`:
  - E.g. `amount = Math.min(...)`
  - Wrap it: `amount = Math.floor(amount / 5) * 5;` to ensure AI bets in multiples of 5!

### Task 4: Final Verification

**Step 1: Test Server Start**
- Run `npm run build` and start the server to ensure no syntax errors block execution.
- Ensure the frontend DOM parses correctly with the new HTML replacements.

**Step 2: Commit**
```bash
git add client/ server/
git commit -m "feat: english ui, editable raise, 5x bet sizing, conservative AI"
```
