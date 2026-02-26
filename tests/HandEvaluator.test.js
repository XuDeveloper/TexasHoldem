import { describe, it, expect } from 'vitest';
import { evaluateHand, compareHands, HandRank } from '../server/game/HandEvaluator.js';
import { Card } from '../server/game/Card.js';

// Helper to create cards quickly: c('A', 'hearts') => Card
const c = (rank, suit) => new Card(suit, rank);

describe('HandEvaluator', () => {
    describe('Hand Detection', () => {
        it('detects royal flush', () => {
            const cards = [c('A', 'hearts'), c('K', 'hearts'), c('Q', 'hearts'), c('J', 'hearts'), c('10', 'hearts'), c('2', 'clubs'), c('3', 'diamonds')];
            const result = evaluateHand(cards);
            expect(result.rank).toBe(HandRank.ROYAL_FLUSH);
            expect(result.name).toBe('Royal Flush');
        });

        it('detects straight flush', () => {
            const cards = [c('9', 'hearts'), c('8', 'hearts'), c('7', 'hearts'), c('6', 'hearts'), c('5', 'hearts'), c('2', 'clubs'), c('3', 'diamonds')];
            expect(evaluateHand(cards).rank).toBe(HandRank.STRAIGHT_FLUSH);
        });

        it('detects A-2-3-4-5 straight flush (steel wheel)', () => {
            const cards = [c('A', 'clubs'), c('2', 'clubs'), c('3', 'clubs'), c('4', 'clubs'), c('5', 'clubs'), c('K', 'hearts'), c('Q', 'diamonds')];
            expect(evaluateHand(cards).rank).toBe(HandRank.STRAIGHT_FLUSH);
        });

        it('detects four of a kind', () => {
            const cards = [c('A', 'hearts'), c('A', 'diamonds'), c('A', 'clubs'), c('A', 'spades'), c('K', 'hearts'), c('2', 'clubs'), c('3', 'diamonds')];
            expect(evaluateHand(cards).rank).toBe(HandRank.FOUR_OF_A_KIND);
        });

        it('detects full house', () => {
            const cards = [c('A', 'hearts'), c('A', 'diamonds'), c('A', 'clubs'), c('K', 'spades'), c('K', 'hearts'), c('2', 'clubs'), c('3', 'diamonds')];
            expect(evaluateHand(cards).rank).toBe(HandRank.FULL_HOUSE);
        });

        it('detects flush', () => {
            const cards = [c('A', 'hearts'), c('K', 'hearts'), c('9', 'hearts'), c('7', 'hearts'), c('4', 'hearts'), c('2', 'clubs'), c('3', 'diamonds')];
            expect(evaluateHand(cards).rank).toBe(HandRank.FLUSH);
        });

        it('detects straight', () => {
            const cards = [c('9', 'hearts'), c('8', 'diamonds'), c('7', 'clubs'), c('6', 'spades'), c('5', 'hearts'), c('2', 'clubs'), c('3', 'diamonds')];
            expect(evaluateHand(cards).rank).toBe(HandRank.STRAIGHT);
        });

        it('detects A-2-3-4-5 wheel straight', () => {
            const cards = [c('A', 'hearts'), c('2', 'diamonds'), c('3', 'clubs'), c('4', 'spades'), c('5', 'hearts'), c('9', 'clubs'), c('K', 'diamonds')];
            expect(evaluateHand(cards).rank).toBe(HandRank.STRAIGHT);
        });

        it('detects A-high straight (broadway)', () => {
            const cards = [c('A', 'hearts'), c('K', 'diamonds'), c('Q', 'clubs'), c('J', 'spades'), c('10', 'hearts'), c('2', 'clubs'), c('3', 'diamonds')];
            expect(evaluateHand(cards).rank).toBe(HandRank.STRAIGHT);
        });

        it('detects three of a kind', () => {
            const cards = [c('A', 'hearts'), c('A', 'diamonds'), c('A', 'clubs'), c('K', 'spades'), c('9', 'hearts'), c('2', 'clubs'), c('3', 'diamonds')];
            expect(evaluateHand(cards).rank).toBe(HandRank.THREE_OF_A_KIND);
        });

        it('detects two pair', () => {
            const cards = [c('A', 'hearts'), c('A', 'diamonds'), c('K', 'clubs'), c('K', 'spades'), c('9', 'hearts'), c('2', 'clubs'), c('3', 'diamonds')];
            expect(evaluateHand(cards).rank).toBe(HandRank.TWO_PAIR);
        });

        it('detects one pair', () => {
            const cards = [c('A', 'hearts'), c('A', 'diamonds'), c('K', 'clubs'), c('9', 'spades'), c('7', 'hearts'), c('2', 'clubs'), c('3', 'diamonds')];
            expect(evaluateHand(cards).rank).toBe(HandRank.ONE_PAIR);
        });

        it('detects high card', () => {
            const cards = [c('A', 'hearts'), c('K', 'diamonds'), c('9', 'clubs'), c('7', 'spades'), c('4', 'hearts'), c('2', 'clubs'), c('3', 'diamonds')];
            expect(evaluateHand(cards).rank).toBe(HandRank.HIGH_CARD);
        });
    });

    describe('Hand Comparison', () => {
        it('higher rank beats lower rank', () => {
            const flush = evaluateHand([c('A', 'hearts'), c('K', 'hearts'), c('9', 'hearts'), c('7', 'hearts'), c('4', 'hearts'), c('2', 'clubs'), c('3', 'diamonds')]);
            const pair = evaluateHand([c('A', 'hearts'), c('A', 'diamonds'), c('K', 'clubs'), c('9', 'spades'), c('7', 'hearts'), c('2', 'clubs'), c('3', 'diamonds')]);
            expect(compareHands(flush, pair)).toBeGreaterThan(0);
        });

        it('same rank: higher kicker wins (pair of A > pair of K)', () => {
            const pairA = evaluateHand([c('A', 'hearts'), c('A', 'diamonds'), c('K', 'clubs'), c('9', 'spades'), c('7', 'hearts'), c('2', 'clubs'), c('3', 'diamonds')]);
            const pairK = evaluateHand([c('K', 'hearts'), c('K', 'diamonds'), c('Q', 'clubs'), c('9', 'spades'), c('7', 'hearts'), c('2', 'clubs'), c('3', 'diamonds')]);
            expect(compareHands(pairA, pairK)).toBeGreaterThan(0);
        });

        it('same pair rank: second kicker decides', () => {
            const aceHighKicker = evaluateHand([c('K', 'hearts'), c('K', 'diamonds'), c('A', 'clubs'), c('9', 'spades'), c('7', 'hearts'), c('2', 'clubs'), c('3', 'diamonds')]);
            const queenHighKicker = evaluateHand([c('K', 'clubs'), c('K', 'spades'), c('Q', 'hearts'), c('9', 'diamonds'), c('7', 'clubs'), c('2', 'diamonds'), c('3', 'hearts')]);
            expect(compareHands(aceHighKicker, queenHighKicker)).toBeGreaterThan(0);
        });

        it('exact same hand is a tie', () => {
            const hand1 = evaluateHand([c('A', 'hearts'), c('K', 'diamonds'), c('9', 'clubs'), c('7', 'spades'), c('4', 'hearts'), c('2', 'clubs'), c('3', 'diamonds')]);
            const hand2 = evaluateHand([c('A', 'clubs'), c('K', 'spades'), c('9', 'hearts'), c('7', 'diamonds'), c('4', 'clubs'), c('2', 'diamonds'), c('3', 'hearts')]);
            expect(compareHands(hand1, hand2)).toBe(0);
        });

        it('higher straight beats lower straight', () => {
            const high = evaluateHand([c('10', 'hearts'), c('9', 'diamonds'), c('8', 'clubs'), c('7', 'spades'), c('6', 'hearts'), c('2', 'clubs'), c('3', 'diamonds')]);
            const low = evaluateHand([c('9', 'hearts'), c('8', 'diamonds'), c('7', 'clubs'), c('6', 'spades'), c('5', 'hearts'), c('2', 'clubs'), c('3', 'diamonds')]);
            expect(compareHands(high, low)).toBeGreaterThan(0);
        });

        it('broadway straight beats wheel', () => {
            const broadway = evaluateHand([c('A', 'hearts'), c('K', 'diamonds'), c('Q', 'clubs'), c('J', 'spades'), c('10', 'hearts'), c('2', 'clubs'), c('3', 'diamonds')]);
            const wheel = evaluateHand([c('A', 'clubs'), c('2', 'diamonds'), c('3', 'hearts'), c('4', 'spades'), c('5', 'clubs'), c('9', 'hearts'), c('K', 'spades')]);
            expect(compareHands(broadway, wheel)).toBeGreaterThan(0);
        });

        it('full house: higher trips win', () => {
            const aOverK = evaluateHand([c('A', 'hearts'), c('A', 'diamonds'), c('A', 'clubs'), c('K', 'spades'), c('K', 'hearts'), c('2', 'clubs'), c('3', 'diamonds')]);
            const kOverA = evaluateHand([c('K', 'clubs'), c('K', 'spades'), c('K', 'diamonds'), c('A', 'hearts'), c('A', 'diamonds'), c('2', 'hearts'), c('3', 'spades')]);
            expect(compareHands(aOverK, kOverA)).toBeGreaterThan(0);
        });
    });

    describe('Edge Cases', () => {
        it('throws with fewer than 5 cards', () => {
            expect(() => evaluateHand([c('A', 'hearts'), c('K', 'hearts')])).toThrow();
        });

        it('works with exactly 5 cards', () => {
            const cards = [c('A', 'hearts'), c('K', 'hearts'), c('Q', 'hearts'), c('J', 'hearts'), c('10', 'hearts')];
            expect(evaluateHand(cards).rank).toBe(HandRank.ROYAL_FLUSH);
        });

        it('picks best hand from 7 cards', () => {
            // 7 cards contain both a flush and a straight, flush should win
            const cards = [c('A', 'hearts'), c('K', 'hearts'), c('9', 'hearts'), c('7', 'hearts'), c('4', 'hearts'), c('5', 'diamonds'), c('6', 'clubs')];
            expect(evaluateHand(cards).rank).toBe(HandRank.FLUSH);
        });
    });
});
