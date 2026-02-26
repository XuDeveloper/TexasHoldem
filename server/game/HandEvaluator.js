/**
 * Poker Hand Evaluator
 * Evaluates 7 cards (2 hole + 5 community) to find the best 5-card hand.
 * Returns a hand ranking that can be compared with other hands.
 */

export const HandRank = {
    HIGH_CARD: 0,
    ONE_PAIR: 1,
    TWO_PAIR: 2,
    THREE_OF_A_KIND: 3,
    STRAIGHT: 4,
    FLUSH: 5,
    FULL_HOUSE: 6,
    FOUR_OF_A_KIND: 7,
    STRAIGHT_FLUSH: 8,
    ROYAL_FLUSH: 9,
};

export const HAND_NAMES = {
    [HandRank.HIGH_CARD]: 'High Card',
    [HandRank.ONE_PAIR]: 'One Pair',
    [HandRank.TWO_PAIR]: 'Two Pair',
    [HandRank.THREE_OF_A_KIND]: 'Three of a Kind',
    [HandRank.STRAIGHT]: 'Straight',
    [HandRank.FLUSH]: 'Flush',
    [HandRank.FULL_HOUSE]: 'Full House',
    [HandRank.FOUR_OF_A_KIND]: 'Four of a Kind',
    [HandRank.STRAIGHT_FLUSH]: 'Straight Flush',
    [HandRank.ROYAL_FLUSH]: 'Royal Flush',
};

/**
 * Generate all C(n, k) combinations from an array.
 */
function combinations(arr, k) {
    const result = [];
    function backtrack(start, current) {
        if (current.length === k) {
            result.push([...current]);
            return;
        }
        for (let i = start; i < arr.length; i++) {
            current.push(arr[i]);
            backtrack(i + 1, current);
            current.pop();
        }
    }
    backtrack(0, []);
    return result;
}

/**
 * Evaluate a 5-card hand and return its rank and kicker values.
 */
function evaluate5(cards) {
    const values = cards.map(c => c.value).sort((a, b) => b - a);
    const suits = cards.map(c => c.suit);

    // Check flush
    const isFlush = suits.every(s => s === suits[0]);

    // Check straight
    let isStraight = false;
    let straightHigh = 0;

    // Normal straight: consecutive values
    if (values[0] - values[4] === 4 && new Set(values).size === 5) {
        isStraight = true;
        straightHigh = values[0];
    }
    // Wheel straight: A-2-3-4-5 (Ace counts as 1)
    if (values[0] === 14 && values[1] === 5 && values[2] === 4 && values[3] === 3 && values[4] === 2) {
        isStraight = true;
        straightHigh = 5; // 5-high straight
    }

    // Count occurrences of each value
    const counts = {};
    for (const v of values) {
        counts[v] = (counts[v] || 0) + 1;
    }

    const countEntries = Object.entries(counts)
        .map(([val, cnt]) => ({ val: parseInt(val), cnt }))
        .sort((a, b) => b.cnt - a.cnt || b.val - a.val);

    const countPattern = countEntries.map(e => e.cnt).join('');

    // Determine hand rank
    if (isFlush && isStraight) {
        if (straightHigh === 14) {
            return { rank: HandRank.ROYAL_FLUSH, kickers: [14] };
        }
        return { rank: HandRank.STRAIGHT_FLUSH, kickers: [straightHigh] };
    }

    if (countPattern === '41') {
        return {
            rank: HandRank.FOUR_OF_A_KIND,
            kickers: [countEntries[0].val, countEntries[1].val],
        };
    }

    if (countPattern === '32') {
        return {
            rank: HandRank.FULL_HOUSE,
            kickers: [countEntries[0].val, countEntries[1].val],
        };
    }

    if (isFlush) {
        return { rank: HandRank.FLUSH, kickers: values };
    }

    if (isStraight) {
        return { rank: HandRank.STRAIGHT, kickers: [straightHigh] };
    }

    if (countPattern === '311') {
        return {
            rank: HandRank.THREE_OF_A_KIND,
            kickers: [countEntries[0].val, countEntries[1].val, countEntries[2].val],
        };
    }

    if (countPattern === '221') {
        return {
            rank: HandRank.TWO_PAIR,
            kickers: [countEntries[0].val, countEntries[1].val, countEntries[2].val],
        };
    }

    if (countPattern === '2111') {
        return {
            rank: HandRank.ONE_PAIR,
            kickers: [countEntries[0].val, countEntries[1].val, countEntries[2].val, countEntries[3].val],
        };
    }

    return { rank: HandRank.HIGH_CARD, kickers: values };
}

/**
 * Evaluate a 7-card hand (or any number >= 5).
 * Returns the best possible 5-card hand evaluation.
 */
export function evaluateHand(cards) {
    if (cards.length < 5) {
        throw new Error('Need at least 5 cards to evaluate');
    }

    const combos = combinations(cards, 5);
    let bestHand = null;

    for (const combo of combos) {
        const evaluation = evaluate5(combo);
        if (!bestHand || compareHands(evaluation, bestHand) > 0) {
            bestHand = evaluation;
            bestHand.cards = combo;
        }
    }

    bestHand.name = HAND_NAMES[bestHand.rank];
    return bestHand;
}

/**
 * Compare two hand evaluations.
 * Returns positive if hand a wins, negative if hand b wins, 0 for tie.
 */
export function compareHands(a, b) {
    if (a.rank !== b.rank) {
        return a.rank - b.rank;
    }

    // Same rank, compare kickers
    for (let i = 0; i < Math.min(a.kickers.length, b.kickers.length); i++) {
        if (a.kickers[i] !== b.kickers[i]) {
            return a.kickers[i] - b.kickers[i];
        }
    }

    return 0; // Exact tie
}
