import { Card, SUITS, RANKS } from './Card.js';

export class Deck {
    constructor() {
        this.cards = [];
        this.reset();
    }

    reset() {
        this.cards = [];
        for (const suit of SUITS) {
            for (const rank of RANKS) {
                this.cards.push(new Card(suit, rank));
            }
        }
    }

    shuffle() {
        // Fisher-Yates shuffle
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
        return this;
    }

    deal() {
        if (this.cards.length === 0) {
            throw new Error('No cards left in deck');
        }
        return this.cards.pop();
    }

    dealMany(count) {
        if (count > this.cards.length) {
            throw new Error(`Cannot deal ${count} cards, only ${this.cards.length} remaining`);
        }
        const dealt = [];
        for (let i = 0; i < count; i++) {
            dealt.push(this.deal());
        }
        return dealt;
    }

    get remaining() {
        return this.cards.length;
    }
}
