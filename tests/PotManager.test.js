import { describe, it, expect } from 'vitest';
import { PotManager } from '../server/game/PotManager.js';

describe('PotManager', () => {
    describe('calculatePots', () => {
        it('creates single pot when all bets equal', () => {
            const pm = new PotManager();
            const pots = pm.calculatePots([
                { id: 'p1', totalBet: 100, folded: false },
                { id: 'p2', totalBet: 100, folded: false },
                { id: 'p3', totalBet: 100, folded: false },
            ]);
            expect(pots).toHaveLength(1);
            expect(pots[0].amount).toBe(300);
            expect(pots[0].eligiblePlayerIds).toEqual(['p1', 'p2', 'p3']);
        });

        it('creates side pot when one player is all-in with less', () => {
            const pm = new PotManager();
            const pots = pm.calculatePots([
                { id: 'p1', totalBet: 50, folded: false },   // all-in
                { id: 'p2', totalBet: 100, folded: false },
                { id: 'p3', totalBet: 100, folded: false },
            ]);
            expect(pots).toHaveLength(2);
            // Main pot: 50 * 3 = 150 (all 3 eligible)
            expect(pots[0].amount).toBe(150);
            expect(pots[0].eligiblePlayerIds).toHaveLength(3);
            // Side pot: 50 * 2 = 100 (only p2 and p3)
            expect(pots[1].amount).toBe(100);
            expect(pots[1].eligiblePlayerIds).toEqual(['p2', 'p3']);
        });

        it('creates multiple side pots with multiple all-ins', () => {
            const pm = new PotManager();
            const pots = pm.calculatePots([
                { id: 'p1', totalBet: 30, folded: false },
                { id: 'p2', totalBet: 60, folded: false },
                { id: 'p3', totalBet: 100, folded: false },
                { id: 'p4', totalBet: 100, folded: false },
            ]);
            expect(pots).toHaveLength(3);
            // Level 1: 30 * 4 = 120
            expect(pots[0].amount).toBe(120);
            expect(pots[0].eligiblePlayerIds).toHaveLength(4);
            // Level 2: 30 * 3 = 90
            expect(pots[1].amount).toBe(90);
            expect(pots[1].eligiblePlayerIds).toHaveLength(3);
            // Level 3: 40 * 2 = 80
            expect(pots[2].amount).toBe(80);
            expect(pots[2].eligiblePlayerIds).toHaveLength(2);
        });

        it('excludes folded players from eligibility', () => {
            const pm = new PotManager();
            const pots = pm.calculatePots([
                { id: 'p1', totalBet: 100, folded: true },
                { id: 'p2', totalBet: 100, folded: false },
                { id: 'p3', totalBet: 100, folded: false },
            ]);
            expect(pots).toHaveLength(1);
            expect(pots[0].amount).toBe(300);
            // p1 is folded, not eligible
            expect(pots[0].eligiblePlayerIds).toEqual(['p2', 'p3']);
        });

        it('handles all players folded except one', () => {
            const pm = new PotManager();
            const pots = pm.calculatePots([
                { id: 'p1', totalBet: 50, folded: true },
                { id: 'p2', totalBet: 100, folded: false },
            ]);
            expect(pots[0].eligiblePlayerIds).toEqual(['p2']);
        });
    });

    describe('getTotal', () => {
        it('returns sum of all pots', () => {
            const pm = new PotManager();
            pm.calculatePots([
                { id: 'p1', totalBet: 50, folded: false },
                { id: 'p2', totalBet: 100, folded: false },
                { id: 'p3', totalBet: 100, folded: false },
            ]);
            expect(pm.getTotal()).toBe(250);
        });
    });

    describe('distributeWinnings', () => {
        it('gives entire pot to single winner', () => {
            const pm = new PotManager();
            pm.calculatePots([
                { id: 'p1', totalBet: 100, folded: false },
                { id: 'p2', totalBet: 100, folded: false },
            ]);

            const winnings = pm.distributeWinnings(
                [
                    { id: 'p1', handEval: { rank: 5, kickers: [14] } },
                    { id: 'p2', handEval: { rank: 1, kickers: [10] } },
                ],
                (a, b) => a.rank - b.rank || a.kickers[0] - b.kickers[0]
            );

            expect(winnings['p1']).toBe(200);
            expect(winnings['p2']).toBeUndefined();
        });

        it('splits pot on tie', () => {
            const pm = new PotManager();
            pm.calculatePots([
                { id: 'p1', totalBet: 100, folded: false },
                { id: 'p2', totalBet: 100, folded: false },
            ]);

            const winnings = pm.distributeWinnings(
                [
                    { id: 'p1', handEval: { rank: 4, kickers: [10] } },
                    { id: 'p2', handEval: { rank: 4, kickers: [10] } },
                ],
                (a, b) => a.rank - b.rank || a.kickers[0] - b.kickers[0]
            );

            expect(winnings['p1']).toBe(100);
            expect(winnings['p2']).toBe(100);
        });

        it('distributes side pots correctly', () => {
            const pm = new PotManager();
            pm.calculatePots([
                { id: 'p1', totalBet: 50, folded: false },   // all-in short
                { id: 'p2', totalBet: 100, folded: false },
                { id: 'p3', totalBet: 100, folded: false },
            ]);

            // p1 has best hand, p2 next
            const winnings = pm.distributeWinnings(
                [
                    { id: 'p1', handEval: { rank: 7, kickers: [14] } }, // best
                    { id: 'p2', handEval: { rank: 5, kickers: [13] } }, // second
                    { id: 'p3', handEval: { rank: 1, kickers: [10] } }, // worst
                ],
                (a, b) => a.rank - b.rank || a.kickers[0] - b.kickers[0]
            );

            // p1 wins main pot (150), can't win side pot
            expect(winnings['p1']).toBe(150);
            // p2 wins side pot (100)
            expect(winnings['p2']).toBe(100);
        });
    });
});
