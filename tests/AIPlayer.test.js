import { describe, it, expect } from 'vitest';
import { decideAction } from '../server/game/AIPlayer.js';
import { Card } from '../server/game/Card.js';

const c = (rank, suit) => new Card(suit, rank);

// Mock game state
function mockGameState(overrides = {}) {
    return {
        currentBet: 10,
        playerStates: [
            { id: 'ai1', bet: 0, totalBet: 0, status: 'active' },
            { id: 'p2', bet: 10, totalBet: 10, status: 'active' },
        ],
        players: [
            { id: 'ai1', name: 'AI', chips: 1000, isAI: true },
            { id: 'p2', name: 'Bob', chips: 990, isAI: false },
        ],
        ...overrides,
    };
}

describe('AIPlayer', () => {
    describe('preflop decisions', () => {
        it('raises with premium hands (AA)', () => {
            const hand = [c('A', 'hearts'), c('A', 'spades')];
            const action = decideAction(hand, [], mockGameState(), 'ai1');
            expect(['raise', 'call']).toContain(action.type);
        });

        it('does not fold with strong hands (JJ)', () => {
            const hand = [c('J', 'hearts'), c('J', 'spades')];
            const action = decideAction(hand, [], mockGameState(), 'ai1');
            expect(action.type).not.toBe('fold');
        });

        it('usually folds with weak hands (72o)', () => {
            const hand = [c('7', 'hearts'), c('2', 'spades')];
            // Run multiple times, should fold more often than not
            let folds = 0;
            for (let i = 0; i < 50; i++) {
                const action = decideAction(hand, [], mockGameState(), 'ai1');
                if (action.type === 'fold') folds++;
            }
            expect(folds).toBeGreaterThan(20); // should fold at least 40% of the time
        });
    });

    describe('postflop decisions', () => {
        it('acts aggressively with strong hands', () => {
            const hand = [c('A', 'hearts'), c('K', 'hearts')];
            const community = [c('A', 'spades'), c('K', 'spades'), c('3', 'diamonds')]; // Two pair
            const action = decideAction(hand, community, mockGameState(), 'ai1');
            expect(['raise', 'call', 'check', 'allin']).toContain(action.type);
            expect(action.type).not.toBe('fold');
        });

        it('can fold with high-card-only postflop facing big bet', () => {
            const hand = [c('7', 'hearts'), c('2', 'spades')];
            const community = [c('A', 'diamonds'), c('K', 'spades'), c('Q', 'clubs')];
            const state = mockGameState({ currentBet: 100 });
            // Run multiple times
            let folds = 0;
            for (let i = 0; i < 30; i++) {
                const action = decideAction(hand, community, state, 'ai1');
                if (action.type === 'fold') folds++;
            }
            expect(folds).toBeGreaterThan(10);
        });
    });

    describe('action validity', () => {
        it('always returns a valid action type', () => {
            const validTypes = ['fold', 'call', 'check', 'raise', 'allin'];
            const hand = [c('A', 'hearts'), c('K', 'hearts')];

            for (let i = 0; i < 20; i++) {
                const action = decideAction(hand, [], mockGameState(), 'ai1');
                expect(validTypes).toContain(action.type);
            }
        });

        it('raise action includes amount', () => {
            const hand = [c('A', 'hearts'), c('A', 'spades')]; // Premium
            let foundRaise = false;
            for (let i = 0; i < 30; i++) {
                const action = decideAction(hand, [], mockGameState(), 'ai1');
                if (action.type === 'raise') {
                    expect(action.amount).toBeGreaterThan(0);
                    foundRaise = true;
                }
            }
            expect(foundRaise).toBe(true);
        });
    });
});
