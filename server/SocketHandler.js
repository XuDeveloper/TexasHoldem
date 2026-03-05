/**
 * Socket Handler
 * Wires Socket.io events to RoomManager and GameEngine.
 */

import { RoomManager } from './RoomManager.js';
import { decideAction } from './game/AIPlayer.js';
import { verifyToken } from './auth.js';

const roomManager = new RoomManager();

// Track disconnect timers
const disconnectTimers = new Map();
// Track turn timers
const turnTimers = new Map();

const DISCONNECT_TIMEOUT = 60000; // 60 seconds
const TURN_TIMEOUT = 30000; // 30 seconds

export function setupSocketHandler(io) {
    // ---- Authentication Middleware ----
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        const user = verifyToken(token);
        if (!user) {
            return next(new Error('Authentication error'));
        }
        // Attach user info to the socket instance
        socket.user = user;
        next();
    });

    io.on('connection', (socket) => {
        console.log(`Player connected: ${socket.id} (User: ${socket.user.username})`);

        // ---- Room Events ----

        socket.on('create-room', ({ name }, callback) => {
            try {
                const room = roomManager.createRoom(socket.id, name);
                socket.join(room.id);
                callback({ success: true, room: sanitizeRoom(room) });
                console.log(`Room ${room.id} created by ${name}`);
            } catch (err) {
                callback({ success: false, error: err.message });
            }
        });

        socket.on('join-room', ({ code, name }, callback) => {
            try {
                const room = roomManager.joinRoom(code.toUpperCase(), socket.id, name);
                socket.join(room.id);
                callback({ success: true, room: sanitizeRoom(room) });
                io.to(room.id).emit('room-update', sanitizeRoom(room));
                console.log(`${name} joined room ${room.id}`);
            } catch (err) {
                callback({ success: false, error: err.message });
            }
        });

        socket.on('add-ai', (callback) => {
            try {
                const room = roomManager.findRoomByPlayer(socket.id);
                if (!room) throw new Error('Not in a room');
                if (room.hostId !== socket.id) throw new Error('Only host can add AI');
                roomManager.addAI(room.id);
                io.to(room.id).emit('room-update', sanitizeRoom(room));
                callback({ success: true });
            } catch (err) {
                callback({ success: false, error: err.message });
            }
        });

        socket.on('start-game', (callback) => {
            try {
                const room = roomManager.findRoomByPlayer(socket.id);
                if (!room) throw new Error('Not in a room');
                const { gameState } = roomManager.startGame(room.id, socket.id);

                // Send game state to each player
                broadcastGameState(io, room);

                callback({ success: true });
                console.log(`Game started in room ${room.id}`);

                // Check if first player is AI
                scheduleAIAction(io, room);
                // Start turn timer
                startTurnTimer(io, room);
            } catch (err) {
                callback({ success: false, error: err.message });
            }
        });

        // ---- Game Events ----

        socket.on('player-action', ({ type, amount }, callback) => {
            try {
                const room = roomManager.findRoomByPlayer(socket.id);
                if (!room || !room.game) throw new Error('No active game');

                clearTurnTimer(room.id);

                const state = room.game.handleAction(socket.id, { type, amount });

                // Broadcast updated state
                broadcastGameState(io, room);

                callback({ success: true });

                // Handle post-action
                if (state.phase === 'showdown') {
                    handleShowdown(io, room);
                } else {
                    scheduleAIAction(io, room);
                    startTurnTimer(io, room);
                }
            } catch (err) {
                callback({ success: false, error: err.message });
            }
        });

        socket.on('confirm-next-round', (callback) => {
            try {
                const room = roomManager.findRoomByPlayer(socket.id);
                if (!room) throw new Error('Not in a room');

                const status = roomManager.confirmPlayer(room.id, socket.id);
                io.to(room.id).emit('next-round-status', status);
                callback({ success: true, status });
            } catch (err) {
                if (callback) callback({ success: false, error: err.message });
            }
        });

        socket.on('next-round', (callback) => {
            try {
                const room = roomManager.findRoomByPlayer(socket.id);
                if (!room) throw new Error('Not in a room');

                const { gameState, ended } = roomManager.nextRound(room.id);

                if (ended) {
                    io.to(room.id).emit('game-ended', sanitizeRoom(room));
                } else {
                    broadcastGameState(io, room);
                    scheduleAIAction(io, room);
                    startTurnTimer(io, room);
                }

                callback({ success: true });
            } catch (err) {
                callback({ success: false, error: err.message });
            }
        });

        // ---- Chat ----

        socket.on('chat-message', ({ message }) => {
            const room = roomManager.findRoomByPlayer(socket.id);
            if (!room) return;

            const txt = message.toLowerCase().trim();
            if (txt === '/off') {
                room.activeEasterEgg = null;
                return;
            } else if (['/royal', '/sf', '/4k'].includes(txt)) {
                // Set active easter egg
                room.activeEasterEgg = { playerId: socket.id, type: txt };
                return; // Do not broadcast
            }

            const player = room.players.find(p => p.id === socket.id);
            io.to(room.id).emit('chat-message', {
                name: player?.name || 'Unknown',
                message,
                timestamp: Date.now(),
            });
        });

        // ---- Disconnect ----

        socket.on('disconnect', () => {
            console.log('Player disconnected:', socket.id);
            const room = roomManager.findRoomByPlayer(socket.id);
            if (!room) return;

            roomManager.disconnectPlayer(room.id, socket.id);
            io.to(room.id).emit('room-update', sanitizeRoom(room));

            // Set reconnect timer
            const timerId = setTimeout(() => {
                const currentRoom = roomManager.getRoom(room.id);
                if (!currentRoom) return;

                const result = roomManager.removePlayer(room.id, socket.id);
                if (result) {
                    io.to(room.id).emit('room-update', sanitizeRoom(result));
                }
                disconnectTimers.delete(socket.id);
            }, DISCONNECT_TIMEOUT);

            disconnectTimers.set(socket.id, { timerId, roomId: room.id });

            // If it's their turn in a game, auto-fold/check
            if (room.game) {
                const state = room.game.getState();
                if (state.currentPlayerId === socket.id) {
                    autoAct(io, room, socket.id);
                }
            }
        });

        // ---- Reconnect ----

        socket.on('reconnect-room', ({ code, name }, callback) => {
            try {
                const room = roomManager.getRoom(code);
                if (!room) throw new Error('Room not found');

                // Find disconnected player with same name
                const player = room.players.find(p => p.name === name && !p.isConnected);
                if (!player) throw new Error('No disconnected player with that name');

                // Clear disconnect timer
                const timerInfo = disconnectTimers.get(player.id);
                if (timerInfo) {
                    clearTimeout(timerInfo.timerId);
                    disconnectTimers.delete(player.id);
                }

                roomManager.reconnectPlayer(code, player.id, socket.id);
                socket.join(room.id);

                callback({ success: true, room: sanitizeRoom(room) });
                io.to(room.id).emit('room-update', sanitizeRoom(room));

                // Send current game state if active
                if (room.game) {
                    socket.emit('game-state', room.game.getStateForPlayer(socket.id));
                    socket.emit('deal-hand', {
                        hand: getPlayerHand(room, socket.id),
                    });
                }
            } catch (err) {
                callback({ success: false, error: err.message });
            }
        });

        // ---- Leave Room ----

        socket.on('leave-room', (callback) => {
            const room = roomManager.findRoomByPlayer(socket.id);
            if (!room) {
                callback?.({ success: true });
                return;
            }

            socket.leave(room.id);

            // If game is active, auto-fold
            if (room.game) {
                const state = room.game.getState();
                if (state.currentPlayerId === socket.id) {
                    autoAct(io, room, socket.id);
                }
            }

            const result = roomManager.removePlayer(room.id, socket.id);
            if (result) {
                io.to(room.id).emit('room-update', sanitizeRoom(result));
            }

            callback?.({ success: true });
        });
    });
}

// ---- Helper Functions ----

function sanitizeRoom(room) {
    return {
        id: room.id,
        hostId: room.hostId,
        status: room.status,
        players: room.players.map(p => ({
            id: p.id,
            name: p.name,
            chips: p.chips,
            isAI: p.isAI,
            isConnected: p.isConnected,
        })),
    };
}

function broadcastGameState(io, room) {
    if (!room.game) return;

    // Send personalized state to each human player
    for (const player of room.players) {
        if (player.isAI) continue;
        const sockets = io.sockets.adapter.rooms.get(room.id);
        if (!sockets) continue;

        const state = room.game.getStateForPlayer(player.id);

        // Emit game-state first to trigger client page transition
        io.to(player.id).emit('game-state', state);

        // Send hand privately second, after client has mounted the game view
        const playerState = room.game.playerStates.find(ps => ps.id === player.id);
        if (playerState && playerState.hand.length > 0) {
            io.to(player.id).emit('deal-hand', {
                hand: playerState.hand.map(c => c.toJSON()),
            });
        }
    }
}

function getPlayerHand(room, playerId) {
    if (!room.game) return [];
    const ps = room.game.playerStates.find(p => p.id === playerId);
    return ps ? ps.hand.map(c => c.toJSON()) : [];
}

function scheduleAIAction(io, room) {
    if (!room.game) return;
    const state = room.game.getState();
    if (state.phase === 'showdown') return;

    const currentPlayer = room.players.find(p => p.id === state.currentPlayerId);
    if (!currentPlayer || !currentPlayer.isAI) return;

    // AI thinks for 1-3 seconds
    const thinkTime = 1000 + Math.random() * 2000;

    setTimeout(() => {
        if (!room.game) return;
        const currentState = room.game.getState();
        if (currentState.currentPlayerId !== currentPlayer.id) return;

        // Get AI's hand
        const playerState = room.game.playerStates.find(ps => ps.id === currentPlayer.id);
        if (!playerState) return;

        const action = decideAction(
            playerState.hand,
            room.game.communityCards,
            currentState,
            currentPlayer.id
        );

        try {
            const newState = room.game.handleAction(currentPlayer.id, action);
            broadcastGameState(io, room);

            if (newState.phase === 'showdown') {
                handleShowdown(io, room);
            } else {
                // Chain: if next player is also AI, schedule again
                scheduleAIAction(io, room);
                startTurnTimer(io, room);
            }
        } catch (err) {
            console.error('AI action error:', err.message);
            // Fallback: fold
            try {
                room.game.handleAction(currentPlayer.id, { type: 'fold' });
                broadcastGameState(io, room);
                scheduleAIAction(io, room);
                startTurnTimer(io, room); // CRITICAL: Timer must restart for the next player!
            } catch (e) {
                console.error('AI fallback error:', e.message);
            }
        }
    }, thinkTime);
}

function autoAct(io, room, playerId) {
    if (!room.game) return;
    const state = room.game.getState();
    if (state.currentPlayerId !== playerId) return;

    const actions = room.game.getValidActions();
    const action = actions.includes('check') ? { type: 'check' } : { type: 'fold' };

    try {
        const newState = room.game.handleAction(playerId, action);
        broadcastGameState(io, room);

        if (newState.phase === 'showdown') {
            handleShowdown(io, room);
        } else {
            scheduleAIAction(io, room);
            startTurnTimer(io, room);
        }
    } catch (err) {
        console.error('Auto-act error:', err.message);
    }
}

function handleShowdown(io, room) {
    clearTurnTimer(room.id);

    if (!room.game) return;
    const state = room.game.getState();

    // Reveal all hands at showdown
    const hands = {};
    for (const ps of room.game.playerStates) {
        if (ps.status !== 'folded') {
            hands[ps.id] = ps.hand.map(c => c.toJSON());
        }
    }

    const isGameOver = room.players.some(p => p.chips <= 0);
    const realCount = room.players.filter(p => !p.isAI).length;

    io.to(room.id).emit('game-result', {
        winners: state.winners,
        hands,
        communityCards: state.communityCards,
        isGameOver,
        nextRoundStatus: { confirmed: room.confirmedPlayers.size, required: realCount },
    });
}

function startTurnTimer(io, room) {
    if (!room.game) return;
    clearTurnTimer(room.id);

    const state = room.game.getState();
    const currentPlayer = room.players.find(p => p.id === state.currentPlayerId);
    if (!currentPlayer || currentPlayer.isAI) return; // AI doesn't need timer

    const timerId = setTimeout(() => {
        autoAct(io, room, state.currentPlayerId);
    }, TURN_TIMEOUT);

    turnTimers.set(room.id, timerId);

    // Tell clients about the timer
    io.to(room.id).emit('turn-timer', {
        playerId: state.currentPlayerId,
        duration: TURN_TIMEOUT,
    });
}

function clearTurnTimer(roomId) {
    const timerId = turnTimers.get(roomId);
    if (timerId) {
        clearTimeout(timerId);
        turnTimers.delete(roomId);
    }
}

export { roomManager };
