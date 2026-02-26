import { describe, it, expect } from 'vitest';
import { Deck } from '../server/game/Deck.js';

describe('Deck', () => {
    it('creates a 52-card deck', () => {
        const deck = new Deck();
        expect(deck.remaining).toBe(52);
    });

    it('deals a card reducing count', () => {
        const deck = new Deck();
        const card = deck.deal();
        expect(card).toBeDefined();
        expect(card.suit).toBeDefined();
        expect(card.rank).toBeDefined();
        expect(deck.remaining).toBe(51);
    });

    it('deals multiple cards', () => {
        const deck = new Deck();
        const cards = deck.dealMany(5);
        expect(cards).toHaveLength(5);
        expect(deck.remaining).toBe(47);
    });

    it('shuffles the deck (order changes)', () => {
        const deck1 = new Deck();
        const deck2 = new Deck();
        deck2.shuffle();
        const cards1 = deck1.dealMany(52).map(c => c.toString());
        const cards2 = deck2.dealMany(52).map(c => c.toString());
        // Extremely unlikely to remain in same order after shuffle
        expect(cards1).not.toEqual(cards2);
    });

    it('all 52 cards are unique after shuffle', () => {
        const deck = new Deck();
        deck.shuffle();
        const cards = deck.dealMany(52).map(c => c.toString());
        expect(new Set(cards).size).toBe(52);
    });

    it('throws when dealing from empty deck', () => {
        const deck = new Deck();
        deck.dealMany(52);
        expect(() => deck.deal()).toThrow('No cards left');
    });

    it('throws when dealing more cards than remaining', () => {
        const deck = new Deck();
        expect(() => deck.dealMany(53)).toThrow();
    });

    it('can be reset', () => {
        const deck = new Deck();
        deck.dealMany(10);
        expect(deck.remaining).toBe(42);
        deck.reset();
        expect(deck.remaining).toBe(52);
    });
});
