import { describe, it, expect } from 'vitest';
import { GameEngine, Phase, PlayerStatus } from '../server/game/GameEngine.js';
import { Card } from '../server/game/Card.js';

describe('GameEngine isBettingRoundComplete Bug', () => {
    it('requires the last active player to call an all-in bet before completing the round', () => {
        const players = [
            { id: 'p1', name: 'Player 1', chips: 100, isAI: false, isConnected: true },
            { id: 'p2', name: 'Player 2', chips: 200, isAI: false, isConnected: true }
        ];

        const engine = new GameEngine(players, { dealerIndex: 0 });
        engine.startRound();
        
        let deckCallCount = 0;
        const mockDeal = () => {
            const cards = [
                new Card('spades', 'Q'), new Card('spades', 'J'), new Card('spades', '10'), // Flop
                new Card('clubs', '2'), // Turn
                new Card('clubs', '3')  // River
            ];
            return cards[deckCallCount++];
        };
        const mockDealMany = (n) => {
            const res = [];
            for(let i=0; i<n; i++) res.push(mockDeal());
            return res;
        };
        
        engine.deck.deal = mockDeal;
        engine.deck.dealMany = mockDealMany;

        const firstActId = engine.playerStates[engine.currentPlayerIndex].id;
        const nextId = firstActId === 'p1' ? 'p2' : 'p1';

        // P1 goes all-in
        engine.handleAction(firstActId, { type: 'allin' }); 

        // After P1's all-in, the round should NOT be complete because P2 still needs to act.
        expect(engine.isBettingRoundComplete()).toBe(false);

        // P2 must be able to act
        expect(engine.currentPlayerIndex).not.toBe(-1);
        expect(engine.playerStates[engine.currentPlayerIndex].id).toBe(nextId);

        // P2 calls
        engine.handleAction(nextId, { type: 'call' });

        // NOW the round is complete.
        expect(engine.phase).toBe(Phase.SHOWDOWN);
    });
});
