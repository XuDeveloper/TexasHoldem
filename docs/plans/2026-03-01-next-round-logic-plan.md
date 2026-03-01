# Next Round Logic Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Modify the end-of-game "Next Round" behavior to require confirmation from all real players before proceeding, while handling pure AI rooms automatically.

**Architecture:** Server-side state tracking `confirmedPlayers` Set in the `Room` object. Provide real-time `next-round-status` updates to the frontend via Socket.io. UI buttons adapt based on whether the player is a host, real player count, and current confirmation status.

**Tech Stack:** Node.js, Socket.io, Vanilla JS/CSS

---

### Task 1: Server-Side State Tracking (RoomManager)

**Files:**
- Modify: `/Users/zhaoxuzhang/Desktop/Project/TexasHoldem/server/RoomManager.js`

**Step 1: Add state to Room creation**
Modify `createRoom` to initialize `confirmedPlayers = new Set()`.

**Step 2: Add `confirmPlayer(roomId, playerId)` method**
Create a method that:
1. Adds `playerId` to the room's `confirmedPlayers` set.
2. Calculates `required`: count of players where `!p.isAI`.
3. Returns `{ confirmed: room.confirmedPlayers.size, required }`.

**Step 3: Reset state on `nextRound`**
Modify `nextRound(roomId)` to clear the set: `room.confirmedPlayers.clear()`.

**Step 4: Commit**
```bash
git add server/RoomManager.js
git commit -m "feat(server): add server-side confirmation state to room"
```

---

### Task 2: Server-Side Socket Handlers (SocketHandler)

**Files:**
- Modify: `/Users/zhaoxuzhang/Desktop/Project/TexasHoldem/server/SocketHandler.js`

**Step 1: Listen for `confirm-next-round` event**
In `setupSocketHandler`, add a listener:
```javascript
socket.on('confirm-next-round', (callback) => {
    try {
        const room = roomManager.findRoomByPlayer(socket.id);
        if (!room) throw new Error('Not in a room');

        const status = roomManager.confirmPlayer(room.id, socket.id);
        
        // Broadcast to everyone in the room
        io.to(room.id).emit('next-round-status', status);
        
        callback({ success: true, status });
    } catch (err) {
        if (callback) callback({ success: false, error: err.message });
    }
});
```

**Step 2: Append initial status to `game-result`**
In `handleShowdown`, calculate the initial required count (`room.players.filter(p => !p.isAI).length`) and attach `nextRoundStatus: { confirmed: room.confirmedPlayers.size, required: realCount }` to the `game-result` emission.

**Step 3: Commit**
```bash
git add server/SocketHandler.js
git commit -m "feat(server): wire up socket events for next round confirmation"
```

---

### Task 3: Client-Side UI & Logic (Game Page)

**Files:**
- Modify: `/Users/zhaoxuzhang/Desktop/Project/TexasHoldem/client/pages/game.js`

**Step 1: Update Socket Listeners & State**
1. Add state variable near the top: `let amIConfirmed = false;`
2. Add listener for `next-round-status`:
```javascript
socket.on('next-round-status', (status) => {
    const btn = document.getElementById('btn-next-round');
    if (btn && !btn.closest('.hidden')) { // overlay is visible
        const isHost = currentRoom.hostId === socket.id;
        renderNextRoundButton(btn, isHost, status);
    }
});
```
3. Reset `amIConfirmed = false` inside `socket.on('game-state')` when `state.phase === 'preflop'`.

**Step 2: Refactor `showGameResult` Button Logic**
Remove the `clearInterval(nextRoundInterval)` and the 20s `setInterval` countdown block.
Instead, initially render the button based on the payload:
```javascript
const isHost = currentRoom.hostId === socket.id;
const initialStatus = { confirmed: 0, required: currentState.players.filter(p => !p.isAI).length }; 
// Or read from the game-result payload if we passed it there
renderNextRoundButton(newBtn, isHost, initialStatus);
```

**Step 3: Implement `renderNextRoundButton` (Helper Function)**
```javascript
function renderNextRoundButton(btn, isHost, status) {
    if (!status) return;

    // Pure AI room check (only host is real)
    if (status.required === 1 && isHost) {
        btn.textContent = 'Next Round';
        btn.className = 'btn btn-primary';
        btn.disabled = false;
        
        // Keep the old trigger logic
        btn.onclick = () => {
             document.getElementById('game-result').classList.add('hidden');
             socket.emit('next-round', (res) => {
                 if (!res.success) showToast(`Error: ${res.error}`);
             });
        };
        return;
    }

    // Mixed Room
    if (status.confirmed >= status.required) {
        if (isHost) {
            btn.textContent = 'Next Round';
            btn.className = 'btn btn-primary';
            btn.disabled = false;
            btn.onclick = () => {
                 document.getElementById('game-result').classList.add('hidden');
                 socket.emit('next-round', (res) => {
                     if (!res.success) showToast(`Error: ${res.error}`);
                 });
            };
        } else {
            btn.textContent = 'Waiting for Host...';
            btn.className = 'btn btn-secondary';
            btn.disabled = true;
            btn.onclick = null;
        }
    } else {
        if (amIConfirmed) {
            btn.textContent = `Confirmed (${status.confirmed}/${status.required})`;
            btn.className = 'btn btn-secondary';
            btn.disabled = true;
            btn.onclick = null;
        } else {
            btn.textContent = `Confirm (${status.confirmed}/${status.required})`;
            btn.className = 'btn btn-primary';
            btn.disabled = false;
            btn.onclick = () => {
                btn.disabled = true; // Optimistic disable
                socket.emit('confirm-next-round', (res) => {
                    if (res.success) {
                        amIConfirmed = true;
                        // The socket.on('next-round-status') will handle re-rendering for everyone, including us
                    } else {
                        btn.disabled = false;
                        showToast(`Error: ${res.error}`);
                    }
                });
            };
        }
    }
}
```

**Step 4: Test in Browser**
1. Ensure the server is running (`npm run dev:server`).
2. Open two browser windows, create a mixed room (2 real players). Play a hand and verify the flow.
3. Open one browser, create a room with 2 AIs. Play a hand and verify it shows "Next Round" immediately.

**Step 5: Commit**
```bash
git add client/pages/game.js
git commit -m "feat(client): implement confirmation UI for next round"
```
