import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine, Phase, PlayerStatus } from '../server/game/GameEngine.js';

describe('GameEngine', () => {
    let engine;
    let players;

    beforeEach(() => {
        players = [
            { id: 'p1', name: 'Alice', chips: 1000 },
            { id: 'p2', name: 'Bob', chips: 1000 },
            { id: 'p3', name: 'Charlie', chips: 1000 },
        ];
        engine = new GameEngine(players, { dealerIndex: 0 });
    });

    describe('startRound', () => {
        it('sets phase to preflop', () => {
            const state = engine.startRound();
            expect(state.phase).toBe(Phase.PREFLOP);
        });

        it('deals 2 cards to each player', () => {
            engine.startRound();
            for (const ps of engine.playerStates) {
                expect(ps.hand).toHaveLength(2);
            }
        });

        it('posts small and big blinds', () => {
            engine.startRound();
            // Dealer=0, SB=1, BB=2
            expect(engine.playerStates[1].bet).toBe(5); // small blind
            expect(engine.playerStates[2].bet).toBe(10); // big blind
        });

        it('deducts blind chips from players', () => {
            engine.startRound();
            expect(engine.players[1].chips).toBe(995); // paid SB
            expect(engine.players[2].chips).toBe(990); // paid BB
        });

        it('sets current player after big blind', () => {
            const state = engine.startRound();
            // UTG (player after BB) should be first to act
            expect(state.currentPlayerId).toBe('p1');
        });
    });

    describe('handleAction', () => {
        beforeEach(() => {
            engine.startRound();
        });

        it('allows fold', () => {
            const state = engine.handleAction('p1', { type: 'fold' });
            expect(engine.playerStates[0].status).toBe(PlayerStatus.FOLDED);
        });

        it('allows call', () => {
            engine.handleAction('p1', { type: 'call' });
            expect(engine.playerStates[0].bet).toBe(10);
            expect(engine.players[0].chips).toBe(990);
        });

        it('allows raise', () => {
            engine.handleAction('p1', { type: 'raise', amount: 20 });
            expect(engine.playerStates[0].bet).toBe(20);
            expect(engine.currentBet).toBe(20);
        });

        it('rejects action from wrong player', () => {
            expect(() => engine.handleAction('p2', { type: 'fold' })).toThrow('Not your turn');
        });

        it('everyone folds: last player wins', () => {
            engine.handleAction('p1', { type: 'fold' });
            const state = engine.handleAction('p2', { type: 'fold' });
            expect(state.phase).toBe(Phase.SHOWDOWN);
            expect(state.winners).toHaveLength(1);
            expect(state.winners[0].id).toBe('p3');
        });
    });

    describe('phase advancement', () => {
        beforeEach(() => {
            engine.startRound();
        });

        it('advances to flop after preflop action completes', () => {
            // Play through preflop by having everyone call/check
            let state = engine.getState();
            let safety = 0;
            while (state.phase === Phase.PREFLOP && safety < 10) {
                const currentId = state.currentPlayerId;
                if (!currentId) break;
                const actions = engine.getValidActions();
                if (actions.includes('check')) {
                    state = engine.handleAction(currentId, { type: 'check' });
                } else {
                    state = engine.handleAction(currentId, { type: 'call' });
                }
                safety++;
            }
            expect(state.phase).toBe(Phase.FLOP);
            expect(state.communityCards).toHaveLength(3);
        });

        it('advances through all phases to showdown', () => {
            // Helper: all players check/call through a phase
            const actAll = () => {
                let state = engine.getState();
                let safety = 0;
                while (state.phase !== Phase.SHOWDOWN && safety < 20) {
                    const currentId = state.currentPlayerId;
                    if (!currentId) break;
                    const actions = engine.getValidActions();
                    if (actions.includes('check')) {
                        state = engine.handleAction(currentId, { type: 'check' });
                    } else if (actions.includes('call')) {
                        state = engine.handleAction(currentId, { type: 'call' });
                    }
                    safety++;
                }
                return state;
            };

            const finalState = actAll();
            expect(finalState.phase).toBe(Phase.SHOWDOWN);
            expect(finalState.communityCards).toHaveLength(5);
            expect(finalState.winners).toBeDefined();
            expect(finalState.winners.length).toBeGreaterThan(0);
        });
    });

    describe('getStateForPlayer', () => {
        it('includes hand for the requesting player', () => {
            engine.startRound();
            const state = engine.getStateForPlayer('p1');
            expect(state.hand).toBeDefined();
            expect(state.hand).toHaveLength(2);
        });
    });

    describe('getValidActions', () => {
        it('returns valid actions for current player', () => {
            engine.startRound();
            const actions = engine.getValidActions();
            expect(actions).toContain('fold');
            expect(actions).toContain('call');
            expect(actions).toContain('raise');
            expect(actions).toContain('allin');
        });
    });
});
