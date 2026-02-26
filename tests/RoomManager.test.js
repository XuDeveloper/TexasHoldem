import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from '../server/RoomManager.js';

describe('RoomManager', () => {
    let rm;

    beforeEach(() => {
        rm = new RoomManager();
    });

    describe('createRoom', () => {
        it('creates a room with a 6-char code', () => {
            const room = rm.createRoom('host1', 'Alice');
            expect(room.id).toHaveLength(6);
            expect(room.hostId).toBe('host1');
            expect(room.players).toHaveLength(1);
            expect(room.players[0].name).toBe('Alice');
            expect(room.status).toBe('waiting');
        });

        it('generates unique room codes', () => {
            const codes = new Set();
            for (let i = 0; i < 20; i++) {
                const room = rm.createRoom(`host${i}`, `Player${i}`);
                codes.add(room.id);
            }
            expect(codes.size).toBe(20);
        });
    });

    describe('joinRoom', () => {
        it('adds a player to existing room', () => {
            const room = rm.createRoom('host1', 'Alice');
            const updated = rm.joinRoom(room.id, 'p2', 'Bob');
            expect(updated.players).toHaveLength(2);
        });

        it('rejects joining non-existent room', () => {
            expect(() => rm.joinRoom('NONE', 'p1', 'Bob')).toThrow('Room not found');
        });

        it('rejects full room', () => {
            const room = rm.createRoom('host1', 'Alice');
            for (let i = 0; i < 8; i++) {
                rm.joinRoom(room.id, `p${i}`, `Player${i}`);
            }
            expect(() => rm.joinRoom(room.id, 'pFull', 'Full')).toThrow('full');
        });

        it('rejects duplicate names', () => {
            const room = rm.createRoom('host1', 'Alice');
            expect(() => rm.joinRoom(room.id, 'p2', 'Alice')).toThrow('Name already taken');
        });
    });

    describe('addAI', () => {
        it('adds AI player to room', () => {
            const room = rm.createRoom('host1', 'Alice');
            rm.addAI(room.id);
            expect(room.players).toHaveLength(2);
            expect(room.players[1].isAI).toBe(true);
            expect(room.players[1].name).toContain('AI');
        });
    });

    describe('removePlayer', () => {
        it('removes player from room', () => {
            const room = rm.createRoom('host1', 'Alice');
            rm.joinRoom(room.id, 'p2', 'Bob');
            rm.removePlayer(room.id, 'p2');
            expect(room.players).toHaveLength(1);
        });

        it('transfers host when host leaves', () => {
            const room = rm.createRoom('host1', 'Alice');
            rm.joinRoom(room.id, 'p2', 'Bob');
            const updated = rm.removePlayer(room.id, 'host1');
            expect(updated.hostId).toBe('p2');
        });

        it('destroys room when all humans leave', () => {
            const room = rm.createRoom('host1', 'Alice');
            rm.addAI(room.id);
            rm.removePlayer(room.id, 'host1');
            expect(rm.getRoom(room.id)).toBeNull();
        });
    });

    describe('startGame', () => {
        it('starts game in room', () => {
            const room = rm.createRoom('host1', 'Alice');
            rm.joinRoom(room.id, 'p2', 'Bob');
            const { gameState } = rm.startGame(room.id, 'host1');
            expect(room.status).toBe('playing');
            expect(gameState.phase).toBe('preflop');
        });

        it('rejects non-host starting', () => {
            const room = rm.createRoom('host1', 'Alice');
            rm.joinRoom(room.id, 'p2', 'Bob');
            expect(() => rm.startGame(room.id, 'p2')).toThrow('Only host');
        });

        it('rejects starting with fewer than 2 players', () => {
            const room = rm.createRoom('host1', 'Alice');
            expect(() => rm.startGame(room.id, 'host1')).toThrow('Need at least 2');
        });
    });

    describe('findRoomByPlayer', () => {
        it('finds room by player ID', () => {
            const room = rm.createRoom('host1', 'Alice');
            const found = rm.findRoomByPlayer('host1');
            expect(found.id).toBe(room.id);
        });

        it('returns null for unknown player', () => {
            expect(rm.findRoomByPlayer('unknown')).toBeNull();
        });
    });
});
