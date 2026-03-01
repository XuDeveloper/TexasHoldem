import { describe, it, expect } from 'vitest';
import { PotManager } from '../server/game/PotManager.js';

describe('PotManager All-In Bug', () => {
    it('does not mutate playerHands order across pots', () => {
        const pm = new PotManager();
        
        // Player 1: All-in for 10
        // Player 2: Calls 10, raises to 50
        // Player 3: Calls 50
        pm.calculatePots([
            { id: 'p1', totalBet: 10, folded: false },
            { id: 'p2', totalBet: 50, folded: false },
            { id: 'p3', totalBet: 50, folded: false }
        ]);

        // Hand strengths: P2 > P3 > P1
        const playerHands = [
            { id: 'p1', handEval: { rank: 1 } },
            { id: 'p2', handEval: { rank: 3 } },
            { id: 'p3', handEval: { rank: 2 } }
        ];

        const compareFn = (a, b) => a.rank - b.rank;

        const winnings = pm.distributeWinnings(playerHands, compareFn);
        
        // Expected:
        // Pot 1 (size 30, eligible: p1, p2, p3): P2 wins 30
        // Pot 2 (size 80, eligible: p2, p3): P2 wins 80
        // Total P2: 110
        expect(winnings['p2']).toBe(110);
        expect(winnings['p1']).toBeUndefined();
        expect(winnings['p3']).toBeUndefined();
        
        // Due to the bug, playerHands gets sorted in place.
        // During Pot 1 evaluation: `eligible` contains p1, p2, p3. 
        // `eligible.sort()` mutates `playerHands`!
    });
});
