import { describe, it, expect } from 'vitest';
import { Card, SUITS, RANKS } from '../server/game/Card.js';

describe('Card', () => {
    it('creates a card with suit and rank', () => {
        const card = new Card('hearts', 'A');
        expect(card.suit).toBe('hearts');
        expect(card.rank).toBe('A');
    });

    it('returns correct numeric value for number cards', () => {
        expect(new Card('hearts', '2').value).toBe(2);
        expect(new Card('hearts', '10').value).toBe(10);
    });

    it('returns correct numeric value for face cards', () => {
        expect(new Card('hearts', 'J').value).toBe(11);
        expect(new Card('hearts', 'Q').value).toBe(12);
        expect(new Card('hearts', 'K').value).toBe(13);
        expect(new Card('hearts', 'A').value).toBe(14);
    });

    it('has correct string representation', () => {
        expect(new Card('hearts', 'A').toString()).toBe('A♥');
        expect(new Card('spades', 'K').toString()).toBe('K♠');
        expect(new Card('diamonds', '10').toString()).toBe('10♦');
        expect(new Card('clubs', '2').toString()).toBe('2♣');
    });

    it('has correct suit symbol', () => {
        expect(new Card('hearts', 'A').suitSymbol).toBe('♥');
        expect(new Card('spades', 'A').suitSymbol).toBe('♠');
    });

    it('serializes to JSON', () => {
        const card = new Card('hearts', 'A');
        expect(card.toJSON()).toEqual({ suit: 'hearts', rank: 'A' });
    });

    it('exports 4 suits and 13 ranks', () => {
        expect(SUITS).toHaveLength(4);
        expect(RANKS).toHaveLength(13);
    });
});
