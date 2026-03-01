# 2026-03-01-next-round-logic-design

## Overview
Modify the end-of-game "Next Round" behavior to require confirmation from all real players before proceeding, while handling pure AI rooms automatically.

## Requirements
1.  **Mixed Rooms (Real Players + AI):**
    *   Instead of a timeout, show a "Confirm (0/N)" button, where N is the number of real players.
    *   Once a real player clicks, it changes to "Confirmed" and becomes disabled for them.
    *   AI players are automatically considered confirmed (so N only counts real players).
    *   Once all real players have confirmed, the Host's button changes to a clickable "Next Round" button, and other real players see "Waiting for host...".
    *   Only the Host can start the next round.
2.  **Pure AI Rooms (Host + All AIs):**
    *   No confirmation flow.
    *   The Host immediately sees the "Next Round" button and can click it at any time.

## Architecture & Data Flow (Server-Side State)
We will manage the confirmation state on the server to ensure consistency.

### 1. Server-Side State (`Room` object)
*   Add `confirmedPlayers = new Set()` to the `Room` object in `server/RoomManager.js`.
*   Add logic to count real players in a room (`getRealPlayerCount(roomId)`).

### 2. Socket Events
*   **`confirm-next-round` (Client -> Server):** Fired when a player clicks "Confirm". Server adds their `socket.id` to `confirmedPlayers`.
*   **`room-update` / `game-result` (Server -> Client):** We need to pass down the current confirmation state. We can either attach `confirmedCount` and `requiredCount` to the `game-result` payload or rely on a new event. Modifying the `game-result` payload is cleaner since the result overlay is tied to this state. Alternatively, emit a dedicated `next-round-status` event whenever someone confirms.
    *   *Decision:* Emit a dedicated `next-round-status: { confirmed: X, required: Y }` event to all clients in the room whenever `confirmedPlayers` changes, so the UI can update live.

### 3. Client-Side UI (`client/pages/game.js`)
*   **State:** Track `amIConfirmed` (boolean).
*   **Render Logic (in `showGameResult` and socket listener):**
    *   If `requiredCount === 1` (Only host is real) AND `isHost`: Show normal "Next Round" button.
    *   Else:
        *   If `amIConfirmed`: Show disabled "Confirmed (X/Y)".
        *   If `!amIConfirmed`: Show clickable "Confirm (X/Y)".
        *   If `X === Y` (Everyone confirmed):
            *   If `isHost`: Show clickable "Next Round".
            *   If `!isHost`: Show disabled "Waiting for Host...".

## Implementation Details

1.  **`server/RoomManager.js`:**
    *   Initialize `this.rooms[id].confirmedPlayers = new Set()` on creation.
    *   Add method `confirmPlayer(roomId, playerId)` which adds to the set and returns the `{ confirmed: number, required: number }` ratio.
    *   Reset `confirmedPlayers` in `nextRound()` method.

2.  **`server/SocketHandler.js`:**
    *   Listen for `'confirm-next-round'`. Call `roomManager.confirmPlayer`.
    *   Broadcast `'next-round-status'` to the room with the updated counts.
    *   When sending `'game-result'`, include the initial `{ confirmed: 0, required: realPlayerCount}` so clients can render immediately.

3.  **`client/pages/game.js`:**
    *   Remove the `setInterval` countdown logic in `showGameResult` unless `isGameOver`.
    *   Add socket listener for `'next-round-status'` to selectively update the button text and state based on whether the current user is the host and their own confirmation status.
    *   `showGameResult` needs to know if the current player is the host (`room.hostId === socket.id`).

## Verification Plan
1.  **Manual Testing (Pure AI Room):**
    *   Create a room, add AI. Play a hand.
    *   Verify the result screen immediately shows "Next Round" for the host.
    *   Click "Next Round" and verify the next hand starts.
2.  **Manual Testing (Mixed Room):**
    *   Open two browsers. Create room in A, join in B.
    *   Play a hand.
    *   Verify both A and B see "Confirm (0/2)".
    *   Click Confirm in A. Verify A sees "Confirmed (1/2)", B sees "Confirm (1/2)".
    *   Click Confirm in B. Verify A (Host) sees "Next Round", B sees "Waiting for Host...".
    *   Click "Next Round" in A and verify the next hand starts.
