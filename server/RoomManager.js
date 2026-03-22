/**
 * Room Manager
 * Handles room creation, joining, leaving, and host management.
 */

import { GameEngine } from './game/GameEngine.js';

export class RoomManager {
    constructor() {
        this.rooms = new Map();
    }

    /**
     * Generate a random 6-character room code.
     */
    generateCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
        let code;
        do {
            code = '';
            for (let i = 0; i < 6; i++) {
                code += chars[Math.floor(Math.random() * chars.length)];
            }
        } while (this.rooms.has(code));
        return code;
    }

    /**
     * Create a new room.
     */
    createRoom(hostId, hostName) {
        const code = this.generateCode();
        const room = {
            id: code,
            hostId,
            players: [{
                id: hostId,
                name: hostName,
                chips: 1000,
                isAI: false,
                isConnected: true,
            }],
            status: 'waiting',
            game: null,
            aiCounter: 0,
            confirmedPlayers: new Set(),
        };
        this.rooms.set(code, room);
        return room;
    }

    /**
     * Join an existing room.
     */
    joinRoom(code, playerId, playerName) {
        const room = this.rooms.get(code);
        if (!room) throw new Error('Room not found');
        if (room.status !== 'waiting') throw new Error('Game already in progress');
        if (room.players.length >= 9) throw new Error('Room is full');
        if (room.players.find(p => p.id === playerId)) throw new Error('Already in room');
        if (room.players.find(p => p.name === playerName && !p.isAI)) {
            throw new Error('Name already taken');
        }

        const player = {
            id: playerId,
            name: playerName,
            chips: 1000,
            isAI: false,
            isConnected: true,
        };
        room.players.push(player);
        return room;
    }

    /**
     * Add a player's confirmation for next round.
     */
    confirmPlayer(roomId, playerId) {
        const room = this.rooms.get(roomId);
        if (!room) throw new Error('Room not found');
        room.confirmedPlayers.add(playerId);
        const required = room.players.filter(p => !p.isAI).length;
        return { confirmed: room.confirmedPlayers.size, required };
    }

    /**
     * Add an AI player to a room.
     */
    addAI(code) {
        const room = this.rooms.get(code);
        if (!room) throw new Error('Room not found');
        if (room.players.length >= 9) throw new Error('Room is full');

        room.aiCounter++;
        const aiNames = ['Alice AI', 'Bob AI', 'Charlie AI', 'Diana AI', 'Eve AI', 'Frank AI', 'Grace AI', 'Henry AI'];
        const aiName = aiNames[(room.aiCounter - 1) % aiNames.length];

        const aggressiveness = Math.random();

        // We no longer append personality info to name, keep it natural
        const ai = {
            id: `ai-${room.id}-${room.aiCounter}`,
            name: aiName,
            chips: 1000,
            isAI: true,
            isConnected: true,
            aggressiveness: aggressiveness,
        };
        room.players.push(ai);

        console.log(`[AI Spawn] Room ${code} | Name: ${aiName} | Aggressiveness: ${aggressiveness.toFixed(2)} (${aggressiveness < 0.3 ? 'Conservative' : aggressiveness > 0.7 ? 'Aggressive' : 'Balanced'})`);

        return room;
    }

    /**
     * Remove a player from a room.
     */
    removePlayer(code, playerId) {
        const room = this.rooms.get(code);
        if (!room) return null;

        room.players = room.players.filter(p => p.id !== playerId);

        // If no human players left, destroy room
        const humans = room.players.filter(p => !p.isAI);
        if (humans.length === 0) {
            this.rooms.delete(code);
            return null;
        }

        // Transfer host if needed
        if (room.hostId === playerId) {
            const newHost = humans[0];
            room.hostId = newHost.id;
        }

        // If the player who had the easter egg disconnected entirely, clear it
        if (room.activeEasterEgg && room.activeEasterEgg.playerId === playerId) {
            room.activeEasterEgg = null;
        }

        return room;
    }

    /**
     * Mark player as disconnected.
     */
    disconnectPlayer(code, playerId) {
        const room = this.rooms.get(code);
        if (!room) return null;

        const player = room.players.find(p => p.id === playerId);
        if (player) {
            player.isConnected = false;
        }
        return room;
    }

    /**
     * Reconnect a player.
     */
    reconnectPlayer(code, oldPlayerId, newPlayerId) {
        const room = this.rooms.get(code);
        if (!room) return null;

        const player = room.players.find(p => p.id === oldPlayerId);
        if (player) {
            player.id = newPlayerId;
            player.isConnected = true;
            if (room.hostId === oldPlayerId) {
                room.hostId = newPlayerId;
            }
            if (room.activeEasterEgg && room.activeEasterEgg.playerId === oldPlayerId) {
                room.activeEasterEgg.playerId = newPlayerId;
            }
        }
        return room;
    }

    /**
     * Start a game in a room.
     */
    startGame(code, requesterId) {
        const room = this.rooms.get(code);
        if (!room) throw new Error('Room not found');
        if (room.hostId !== requesterId) throw new Error('Only host can start');
        if (room.players.length < 2) throw new Error('Need at least 2 players');

        room.status = 'playing';
        const dealerIndex = room.game
            ? (room.game.dealerIndex + 1) % room.players.length
            : 0;

        const options = { dealerIndex };
        if (room.activeEasterEgg) {
            options.easterEgg = room.activeEasterEgg;
        }

        room.game = new GameEngine(room.players, options);
        const state = room.game.startRound();

        return { room, gameState: state };
    }

    /**
     * Start next round in a room.
     */
    nextRound(code) {
        const room = this.rooms.get(code);
        if (!room || !room.game) throw new Error('No active game');

        room.confirmedPlayers.clear();

        const activePlayers = room.players.filter(p => p.chips > 0);
        if (activePlayers.length < 2) {
            room.status = 'waiting';
            room.game = null;
            return { room, gameState: null, ended: true };
        }

        // Calculate new dealer based on original seating order before removing busted players
        const oldDealerId = room.game.players[room.game.dealerIndex].id;
        const oldDealerRoomIdx = room.players.findIndex(p => p.id === oldDealerId);
        let newDealerId = activePlayers[0].id;
        for (let i = 1; i <= room.players.length; i++) {
            const p = room.players[(oldDealerRoomIdx + i) % room.players.length];
            if (p.chips > 0) {
                newDealerId = p.id;
                break;
            }
        }

        // Remove busted players
        room.players = activePlayers;

        const dealerIndex = Math.max(0, room.players.findIndex(p => p.id === newDealerId));
        const options = { dealerIndex };
        if (room.activeEasterEgg) {
            options.easterEgg = room.activeEasterEgg;
        }

        room.game = new GameEngine(room.players, options);
        const state = room.game.startRound();

        return { room, gameState: state, ended: false };
    }

    /**
     * Get a room by code.
     */
    getRoom(code) {
        return this.rooms.get(code) || null;
    }

    /**
     * Find room by player ID.
     */
    findRoomByPlayer(playerId) {
        for (const [code, room] of this.rooms) {
            if (room.players.find(p => p.id === playerId)) {
                return room;
            }
        }
        return null;
    }

    /**
     * Get room count (for debugging).
     */
    getRoomCount() {
        return this.rooms.size;
    }
}
