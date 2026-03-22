/**
 * Multiplayer Integration Tests
 * Simulates multiple players connecting via Socket.io and playing concurrently.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as ioc } from 'socket.io-client';
import { setupSocketHandler, roomManager } from '../server/SocketHandler.js';
import { createToken } from '../server/auth.js';

let httpServer;
let ioServer;
let port;

function createTestUser(username) {
    const user = { id: `u_${username}`, username, name: username };
    const token = createToken(user);
    return { user, token };
}

function connectClient(token) {
    return new Promise((resolve, reject) => {
        const socket = ioc(`http://localhost:${port}`, {
            auth: { token },
            transports: ['websocket'],
            forceNew: true,
        });
        socket.on('connect', () => resolve(socket));
        socket.on('connect_error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
}

// For events WITH data payload
function emitWithData(socket, event, data) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`Timeout: ${event}`)), 5000);
        socket.emit(event, data, (response) => {
            clearTimeout(timeout);
            resolve(response);
        });
    });
}

// For events WITHOUT data payload (callback is the only arg)
function emitNoData(socket, event) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`Timeout: ${event}`)), 5000);
        socket.emit(event, (response) => {
            clearTimeout(timeout);
            resolve(response);
        });
    });
}

function waitForEvent(socket, event, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`Timeout waiting for ${event}`)), timeoutMs);
        socket.once(event, (data) => {
            clearTimeout(timeout);
            resolve(data);
        });
    });
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

beforeAll(async () => {
    httpServer = createServer();
    ioServer = new Server(httpServer, { cors: { origin: '*' } });
    setupSocketHandler(ioServer);
    await new Promise((resolve) => {
        httpServer.listen(0, () => {
            port = httpServer.address().port;
            resolve();
        });
    });
});

afterAll(async () => {
    ioServer.close();
    await new Promise((resolve) => httpServer.close(resolve));
});

afterEach(() => {
    for (const [code] of roomManager.rooms) {
        roomManager.rooms.delete(code);
    }
});

describe('Multiplayer Integration', () => {
    let sockets = [];

    afterEach(() => {
        for (const s of sockets) {
            if (s.connected) s.disconnect();
        }
        sockets = [];
    });

    async function connectPlayer(name) {
        const { token } = createTestUser(name);
        const socket = await connectClient(token);
        sockets.push(socket);
        return socket;
    }

    // =========================================================================
    // Room Creation & Joining
    // =========================================================================

    describe('Room Creation & Joining', () => {
        it('player creates a room and another joins', async () => {
            const alice = await connectPlayer('Alice');
            const bob = await connectPlayer('Bob');

            const createRes = await emitWithData(alice, 'create-room', { name: 'Alice' });
            expect(createRes.success).toBe(true);
            const roomCode = createRes.room.id;

            const joinRes = await emitWithData(bob, 'join-room', { code: roomCode, name: 'Bob' });
            expect(joinRes.success).toBe(true);
            expect(joinRes.room.players).toHaveLength(2);
        });

        it('3 players join the same room concurrently', async () => {
            const host = await connectPlayer('Host');
            const createRes = await emitWithData(host, 'create-room', { name: 'Host' });
            const code = createRes.room.id;

            const p2 = await connectPlayer('P2');
            const p3 = await connectPlayer('P3');
            const p4 = await connectPlayer('P4');

            const [r2, r3, r4] = await Promise.all([
                emitWithData(p2, 'join-room', { code, name: 'P2' }),
                emitWithData(p3, 'join-room', { code, name: 'P3' }),
                emitWithData(p4, 'join-room', { code, name: 'P4' }),
            ]);

            expect(r2.success).toBe(true);
            expect(r3.success).toBe(true);
            expect(r4.success).toBe(true);

            const room = roomManager.getRoom(code);
            expect(room.players).toHaveLength(4);
        });

        it('rejects joining a non-existent room', async () => {
            const p = await connectPlayer('Player');
            const res = await emitWithData(p, 'join-room', { code: 'XXXXXX', name: 'Player' });
            expect(res.success).toBe(false);
            expect(res.error).toMatch(/not found/i);
        });

        it('rejects duplicate name in the same room', async () => {
            const alice = await connectPlayer('Alice');
            const bob = await connectPlayer('Bob');

            const createRes = await emitWithData(alice, 'create-room', { name: 'Alice' });
            const res = await emitWithData(bob, 'join-room', { code: createRes.room.id, name: 'Alice' });
            expect(res.success).toBe(false);
            expect(res.error).toMatch(/name/i);
        });
    });

    // =========================================================================
    // Multiple Rooms Running Simultaneously
    // =========================================================================

    describe('Multiple Rooms Simultaneously', () => {
        it('two independent rooms can be created and played', async () => {
            const a1 = await connectPlayer('Room1Host');
            const a2 = await connectPlayer('Room1P2');
            const b1 = await connectPlayer('Room2Host');
            const b2 = await connectPlayer('Room2P2');

            const room1Res = await emitWithData(a1, 'create-room', { name: 'Room1Host' });
            const room2Res = await emitWithData(b1, 'create-room', { name: 'Room2Host' });

            await emitWithData(a2, 'join-room', { code: room1Res.room.id, name: 'Room1P2' });
            await emitWithData(b2, 'join-room', { code: room2Res.room.id, name: 'Room2P2' });

            const gsP1 = waitForEvent(a1, 'game-state');
            const gsP2 = waitForEvent(b1, 'game-state');

            const [start1, start2] = await Promise.all([
                emitNoData(a1, 'start-game'),
                emitNoData(b1, 'start-game'),
            ]);

            expect(start1.success).toBe(true);
            expect(start2.success).toBe(true);

            const gs1 = await gsP1;
            const gs2 = await gsP2;

            expect(gs1.phase).toBe('preflop');
            expect(gs2.phase).toBe('preflop');
            expect(roomManager.getRoomCount()).toBe(2);
        });
    });

    // =========================================================================
    // Full Game Flow (2 Players)
    // =========================================================================

    describe('Full Game Flow - 2 Players', () => {
        it('two players complete a full hand (all check/call to showdown)', async () => {
            const alice = await connectPlayer('Alice');
            const bob = await connectPlayer('Bob');

            const createRes = await emitWithData(alice, 'create-room', { name: 'Alice' });
            const code = createRes.room.id;
            await emitWithData(bob, 'join-room', { code, name: 'Bob' });

            let aliceState = null;
            let bobState = null;
            alice.on('game-state', (s) => { aliceState = s; });
            bob.on('game-state', (s) => { bobState = s; });

            let aliceResult = null;
            let bobResult = null;
            alice.on('game-result', (r) => { aliceResult = r; });
            bob.on('game-result', (r) => { bobResult = r; });

            await emitNoData(alice, 'start-game');
            await sleep(200);

            expect(aliceState).not.toBeNull();
            expect(aliceState.phase).toBe('preflop');

            let safety = 0;
            while (safety < 30) {
                await sleep(50);
                if (aliceResult) break;

                const state = aliceState;
                if (!state || state.phase === 'showdown') break;

                const currentId = state.currentPlayerId;
                if (!currentId) break;

                const currentSocket = currentId === alice.id ? alice : bob;
                const ps = state.playerStates.find(p => p.id === currentId);
                if (!ps || ps.status !== 'active') break;

                const action = ps.bet >= state.currentBet ? { type: 'check' } : { type: 'call' };
                const res = await emitWithData(currentSocket, 'player-action', action);
                if (!res.success) break;
                await sleep(50);
                safety++;
            }

            expect(aliceResult).not.toBeNull();
            expect(aliceResult.winners).toBeDefined();
            expect(aliceResult.winners.length).toBeGreaterThan(0);
            expect(aliceResult.communityCards).toHaveLength(5);
            expect(bobResult).not.toBeNull();
            expect(bobResult.winners).toEqual(aliceResult.winners);
        }, 15000);

        it('player folds, opponent wins immediately', async () => {
            const alice = await connectPlayer('FoldAlice');
            const bob = await connectPlayer('FoldBob');

            const createRes = await emitWithData(alice, 'create-room', { name: 'FoldAlice' });
            await emitWithData(bob, 'join-room', { code: createRes.room.id, name: 'FoldBob' });

            let result = null;
            alice.on('game-result', (r) => { result = r; });
            bob.on('game-result', (r) => { result = r; });

            let latestState = null;
            alice.on('game-state', (s) => { latestState = s; });
            bob.on('game-state', (s) => { latestState = s; });

            await emitNoData(alice, 'start-game');
            await sleep(200);

            const currentId = latestState.currentPlayerId;
            const currentSocket = currentId === alice.id ? alice : bob;

            const res = await emitWithData(currentSocket, 'player-action', { type: 'fold' });
            expect(res.success).toBe(true);
            await sleep(200);

            expect(result).not.toBeNull();
            expect(result.winners).toHaveLength(1);
            expect(result.winners[0].handName).toBe('Everyone folded');
        }, 10000);
    });

    // =========================================================================
    // Full Game Flow - 3 Players
    // =========================================================================

    describe('Full Game Flow - 3 Players', () => {
        it('three players complete a full hand', async () => {
            const p1 = await connectPlayer('P1');
            const p2 = await connectPlayer('P2');
            const p3 = await connectPlayer('P3');

            const createRes = await emitWithData(p1, 'create-room', { name: 'P1' });
            const code = createRes.room.id;
            await emitWithData(p2, 'join-room', { code, name: 'P2' });
            await emitWithData(p3, 'join-room', { code, name: 'P3' });

            const socketMap = { [p1.id]: p1, [p2.id]: p2, [p3.id]: p3 };
            let latestState = null;
            let result = null;
            for (const s of [p1, p2, p3]) {
                s.on('game-state', (st) => { latestState = st; });
                s.on('game-result', (r) => { result = r; });
            }

            await emitNoData(p1, 'start-game');
            await sleep(200);

            let safety = 0;
            while (safety < 40) {
                await sleep(50);
                if (result) break;
                if (!latestState || latestState.phase === 'showdown') break;

                const currentId = latestState.currentPlayerId;
                if (!currentId) break;

                const sock = socketMap[currentId];
                if (!sock) break;

                const ps = latestState.playerStates.find(p => p.id === currentId);
                if (!ps || ps.status !== 'active') break;

                const action = ps.bet >= latestState.currentBet ? { type: 'check' } : { type: 'call' };
                const res = await emitWithData(sock, 'player-action', action);
                if (!res.success) break;
                await sleep(50);
                safety++;
            }

            expect(result).not.toBeNull();
            expect(result.winners.length).toBeGreaterThan(0);
            expect(result.communityCards).toHaveLength(5);
        }, 15000);

        it('one player folds, remaining two continue to showdown', async () => {
            const p1 = await connectPlayer('FP1');
            const p2 = await connectPlayer('FP2');
            const p3 = await connectPlayer('FP3');

            const createRes = await emitWithData(p1, 'create-room', { name: 'FP1' });
            const code = createRes.room.id;
            await emitWithData(p2, 'join-room', { code, name: 'FP2' });
            await emitWithData(p3, 'join-room', { code, name: 'FP3' });

            const socketMap = { [p1.id]: p1, [p2.id]: p2, [p3.id]: p3 };
            let latestState = null;
            let result = null;
            for (const s of [p1, p2, p3]) {
                s.on('game-state', (st) => { latestState = st; });
                s.on('game-result', (r) => { result = r; });
            }

            await emitNoData(p1, 'start-game');
            await sleep(200);

            let firstPlayerFolded = false;
            let safety = 0;
            while (safety < 40) {
                await sleep(50);
                if (result) break;
                if (!latestState || latestState.phase === 'showdown') break;

                const currentId = latestState.currentPlayerId;
                if (!currentId) break;

                const sock = socketMap[currentId];
                if (!sock) break;

                let action;
                if (!firstPlayerFolded) {
                    action = { type: 'fold' };
                    firstPlayerFolded = true;
                } else {
                    const ps = latestState.playerStates.find(p => p.id === currentId);
                    if (!ps || ps.status !== 'active') break;
                    action = ps.bet >= latestState.currentBet ? { type: 'check' } : { type: 'call' };
                }

                const res = await emitWithData(sock, 'player-action', action);
                if (!res.success) break;
                await sleep(50);
                safety++;
            }

            expect(result).not.toBeNull();
            expect(result.winners.length).toBeGreaterThan(0);
        }, 15000);
    });

    // =========================================================================
    // Raise & All-in Scenarios
    // =========================================================================

    describe('Raise & All-in', () => {
        it('raise forces other player to act again', async () => {
            const alice = await connectPlayer('RaiseA');
            const bob = await connectPlayer('RaiseB');

            const createRes = await emitWithData(alice, 'create-room', { name: 'RaiseA' });
            await emitWithData(bob, 'join-room', { code: createRes.room.id, name: 'RaiseB' });

            let latestState = null;
            alice.on('game-state', (s) => { latestState = s; });
            bob.on('game-state', (s) => { latestState = s; });

            await emitNoData(alice, 'start-game');
            await sleep(200);

            const firstId = latestState.currentPlayerId;
            const firstSock = firstId === alice.id ? alice : bob;
            let res = await emitWithData(firstSock, 'player-action', { type: 'raise', amount: 20 });
            expect(res.success).toBe(true);
            await sleep(100);

            expect(latestState.currentPlayerId).not.toBe(firstId);
            const secondSock = latestState.currentPlayerId === alice.id ? alice : bob;

            res = await emitWithData(secondSock, 'player-action', { type: 'call' });
            expect(res.success).toBe(true);
            await sleep(100);

            // After raise + call in heads-up preflop, should advance
            expect(['flop', 'preflop']).toContain(latestState.phase);
        }, 10000);

        it('all-in triggers showdown when opponent calls', async () => {
            const alice = await connectPlayer('AllInA');
            const bob = await connectPlayer('AllInB');

            const createRes = await emitWithData(alice, 'create-room', { name: 'AllInA' });
            await emitWithData(bob, 'join-room', { code: createRes.room.id, name: 'AllInB' });

            let latestState = null;
            let result = null;
            alice.on('game-state', (s) => { latestState = s; });
            bob.on('game-state', (s) => { latestState = s; });
            alice.on('game-result', (r) => { result = r; });
            bob.on('game-result', (r) => { result = r; });

            await emitNoData(alice, 'start-game');
            await sleep(200);

            const firstId = latestState.currentPlayerId;
            const firstSock = firstId === alice.id ? alice : bob;
            await emitWithData(firstSock, 'player-action', { type: 'allin' });
            await sleep(100);

            if (latestState.currentPlayerId && !result) {
                const secondId = latestState.currentPlayerId;
                const secondSock = secondId === alice.id ? alice : bob;
                await emitWithData(secondSock, 'player-action', { type: 'call' });
                await sleep(300);
            }

            expect(result).not.toBeNull();
            expect(result.communityCards).toHaveLength(5);
            expect(result.winners.length).toBeGreaterThan(0);
        }, 10000);
    });

    // =========================================================================
    // Player Disconnect & Reconnect
    // =========================================================================

    describe('Disconnect & Reconnect', () => {
        it('disconnected player is marked as not connected', async () => {
            const alice = await connectPlayer('DCAlice');
            const bob = await connectPlayer('DCBob');

            const createRes = await emitWithData(alice, 'create-room', { name: 'DCAlice' });
            const code = createRes.room.id;

            const roomUpdatePromise = waitForEvent(alice, 'room-update');
            await emitWithData(bob, 'join-room', { code, name: 'DCBob' });
            await roomUpdatePromise;

            const roomUpdateAfterDC = waitForEvent(alice, 'room-update');
            bob.disconnect();
            const update = await roomUpdateAfterDC;

            const dcPlayer = update.players.find(p => p.name === 'DCBob');
            expect(dcPlayer.isConnected).toBe(false);
        }, 10000);

        it('player reconnects to room and gets game state', async () => {
            const alice = await connectPlayer('RCAlice');
            const bob = await connectPlayer('RCBob');

            const createRes = await emitWithData(alice, 'create-room', { name: 'RCAlice' });
            const code = createRes.room.id;
            await emitWithData(bob, 'join-room', { code, name: 'RCBob' });

            await emitNoData(alice, 'start-game');
            await sleep(200);

            bob.disconnect();
            await sleep(200);

            const { token: bobToken2 } = createTestUser('RCBob2');
            const bob2 = await connectClient(bobToken2);
            sockets.push(bob2);

            const gameStatePromise = waitForEvent(bob2, 'game-state');
            const res = await emitWithData(bob2, 'reconnect-room', { code, name: 'RCBob' });
            expect(res.success).toBe(true);

            const gameState = await gameStatePromise;
            expect(gameState.phase).toBeDefined();
            expect(['preflop', 'flop', 'turn', 'river']).toContain(gameState.phase);
        }, 10000);
    });

    // =========================================================================
    // Leave Room During Game
    // =========================================================================

    describe('Leave Room During Game', () => {
        it('player leaves during active game, game continues', async () => {
            const p1 = await connectPlayer('LV1');
            const p2 = await connectPlayer('LV2');
            const p3 = await connectPlayer('LV3');

            const createRes = await emitWithData(p1, 'create-room', { name: 'LV1' });
            const code = createRes.room.id;
            await emitWithData(p2, 'join-room', { code, name: 'LV2' });
            await emitWithData(p3, 'join-room', { code, name: 'LV3' });

            await emitNoData(p1, 'start-game');
            await sleep(200);

            const leaveRes = await emitNoData(p3, 'leave-room');
            expect(leaveRes.success).toBe(true);
            await sleep(200);

            const room = roomManager.getRoom(code);
            expect(room).not.toBeNull();
            expect(room.players.find(p => p.name === 'LV3')).toBeUndefined();
        }, 10000);
    });

    // =========================================================================
    // Next Round Flow
    // =========================================================================

    describe('Next Round Flow', () => {
        it('both players confirm and start next round', async () => {
            const alice = await connectPlayer('NRAlice');
            const bob = await connectPlayer('NRBob');

            const createRes = await emitWithData(alice, 'create-room', { name: 'NRAlice' });
            const code = createRes.room.id;
            await emitWithData(bob, 'join-room', { code, name: 'NRBob' });

            let latestState = null;
            let result = null;
            alice.on('game-state', (s) => { latestState = s; });
            bob.on('game-state', (s) => { latestState = s; });
            alice.on('game-result', (r) => { result = r; });
            bob.on('game-result', (r) => { result = r; });

            await emitNoData(alice, 'start-game');
            await sleep(200);

            // First player folds to end the round quickly
            const currentId = latestState.currentPlayerId;
            const currentSock = currentId === alice.id ? alice : bob;
            await emitWithData(currentSock, 'player-action', { type: 'fold' });
            await sleep(300);

            expect(result).not.toBeNull();

            const c1 = await emitNoData(alice, 'confirm-next-round');
            expect(c1.success).toBe(true);

            const c2 = await emitNoData(bob, 'confirm-next-round');
            expect(c2.success).toBe(true);
            expect(c2.status.confirmed).toBe(2);

            // Reset for next round
            result = null;
            latestState = null;
            const res = await emitNoData(alice, 'next-round');
            expect(res.success).toBe(true);
            await sleep(200);

            expect(latestState).not.toBeNull();
            expect(latestState.phase).toBe('preflop');
        }, 10000);
    });

    // =========================================================================
    // Chat During Game
    // =========================================================================

    describe('Chat', () => {
        it('chat messages are broadcast to room members', async () => {
            const alice = await connectPlayer('ChatA');
            const bob = await connectPlayer('ChatB');

            const createRes = await emitWithData(alice, 'create-room', { name: 'ChatA' });
            await emitWithData(bob, 'join-room', { code: createRes.room.id, name: 'ChatB' });

            const msgPromise = waitForEvent(bob, 'chat-message');
            alice.emit('chat-message', { message: 'Hello from Alice!' });
            const msg = await msgPromise;

            expect(msg.name).toBe('ChatA');
            expect(msg.message).toBe('Hello from Alice!');
            expect(msg.timestamp).toBeDefined();
        });
    });

    // =========================================================================
    // AI Players in Multiplayer
    // =========================================================================

    describe('AI Players', () => {
        it('game with human + AI completes automatically', async () => {
            const alice = await connectPlayer('AITestHost');

            const createRes = await emitWithData(alice, 'create-room', { name: 'AITestHost' });
            const code = createRes.room.id;

            const addAIRes = await emitNoData(alice, 'add-ai');
            expect(addAIRes.success).toBe(true);

            let result = null;
            let latestState = null;
            alice.on('game-state', (s) => { latestState = s; });
            alice.on('game-result', (r) => { result = r; });

            await emitNoData(alice, 'start-game');
            await sleep(500);

            let safety = 0;
            while (safety < 50) {
                await sleep(300);
                if (result) break;
                if (!latestState) continue;
                if (latestState.phase === 'showdown') break;

                const currentId = latestState.currentPlayerId;
                if (currentId === alice.id) {
                    const ps = latestState.playerStates.find(p => p.id === currentId);
                    if (!ps || ps.status !== 'active') { safety++; continue; }
                    const action = ps.bet >= latestState.currentBet ? { type: 'check' } : { type: 'call' };
                    await emitWithData(alice, 'player-action', action);
                }
                safety++;
            }

            expect(result).not.toBeNull();
            expect(result.winners.length).toBeGreaterThan(0);
        }, 30000);
    });

    // =========================================================================
    // Stress: Many Players Join Rapidly
    // =========================================================================

    describe('Stress', () => {
        it('6 players join room and start a game', async () => {
            const host = await connectPlayer('StressHost');
            const createRes = await emitWithData(host, 'create-room', { name: 'StressHost' });
            const code = createRes.room.id;

            const players = [host];
            for (let i = 2; i <= 6; i++) {
                const p = await connectPlayer(`SP${i}`);
                const res = await emitWithData(p, 'join-room', { code, name: `SP${i}` });
                expect(res.success).toBe(true);
                players.push(p);
            }

            const room = roomManager.getRoom(code);
            expect(room.players).toHaveLength(6);

            let latestState = null;
            for (const p of players) {
                p.on('game-state', (s) => { latestState = s; });
            }

            const res = await emitNoData(host, 'start-game');
            expect(res.success).toBe(true);
            await sleep(300);

            expect(latestState).not.toBeNull();
            expect(latestState.phase).toBe('preflop');
            expect(latestState.players).toHaveLength(6);
        }, 15000);
    });

    // =========================================================================
    // Auth
    // =========================================================================

    describe('Authentication', () => {
        it('rejects connection without valid token', async () => {
            const err = await new Promise((resolve) => {
                const socket = ioc(`http://localhost:${port}`, {
                    auth: { token: 'invalid-token' },
                    transports: ['websocket'],
                    forceNew: true,
                });
                socket.on('connect', () => {
                    sockets.push(socket);
                    resolve(null);
                });
                socket.on('connect_error', (e) => {
                    socket.disconnect();
                    resolve(e);
                });
                setTimeout(() => resolve(new Error('timeout')), 3000);
            });
            expect(err).not.toBeNull();
        });
    });
});
