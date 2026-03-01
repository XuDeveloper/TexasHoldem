import { describe, it, expect } from 'vitest';
import { GameEngine, Phase } from '../server/game/GameEngine.js';
import { Card } from '../server/game/Card.js';

describe('GameEngine All-In Win Bug', () => {
    it('correctly awards pot to the winner in an all-in situation', () => {
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

        // Force known hole cards
        const p1State = engine.playerStates.find(ps => ps.id === 'p1');
        const p2State = engine.playerStates.find(ps => ps.id === 'p2');
        p1State.hand = [new Card('spades', 'A'), new Card('spades', 'K')]; 
        p2State.hand = [new Card('hearts', '2'), new Card('diamonds', '7')]; 

        const firstActId = engine.playerStates[engine.currentPlayerIndex].id;
        console.log("FIRST TO ACT:", firstActId);
        
        // Let's just have the first person act
        engine.handleAction(firstActId, { type: 'allin' }); 
        
        const nextActId = engine.playerStates[engine.currentPlayerIndex].id;
        console.log("NEXT TO ACT:", nextActId);

        // Then second person acts
        const state = engine.handleAction(nextActId, { type: 'call' });
        
        // State should be showdown
        expect(state.phase).toBe(Phase.SHOWDOWN);
        
        expect(state.winners.length).toBe(1);
        expect(state.winners[0].id).toBe('p1', 'p1 should win with broadway straight vs junk');
        expect(state.winners[0].amount).toBe(200);
        
        expect(players[0].chips).toBe(200); 
        expect(players[1].chips).toBe(100); 
    });
});
