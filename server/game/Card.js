export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const SUIT_SYMBOLS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const RANK_VALUES = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
    '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

export class Card {
    constructor(suit, rank) {
        this.suit = suit;
        this.rank = rank;
    }

    get value() {
        return RANK_VALUES[this.rank];
    }

    get suitSymbol() {
        return SUIT_SYMBOLS[this.suit];
    }

    toString() {
        return `${this.rank}${SUIT_SYMBOLS[this.suit]}`;
    }

    toJSON() {
        return { suit: this.suit, rank: this.rank };
    }
}
