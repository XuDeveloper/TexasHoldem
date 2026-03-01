# Next Round Logic Execution

## Task 1: Server-Side State Tracking (RoomManager)
- Initialize `confirmedPlayers = new Set()` in `createRoom`.
- Add `confirmPlayer(roomId, playerId)` to add player and return stats.
- Clear `confirmedPlayers` in `nextRound(roomId)`.

## Task 2: Server-Side Socket Handlers (SocketHandler)
- Add `'confirm-next-round'` listener to call `confirmPlayer` and emit `'next-round-status'`.
- Add `nextRoundStatus` payload to `'game-result'` emission in `handleShowdown`.

## Task 3: Client-Side UI & Logic (Game Page)
- Add `amIConfirmed` state and reset logic.
- Add `next-round-status` socket listener.
- Refactor `showGameResult` button logic.
- Implement `renderNextRoundButton` helper.
