/**
 * AI Player
 * Simple rule-based AI for Texas Hold'em.
 * Makes decisions based on hand strength with some randomness.
 */

import { evaluateHand, HandRank } from './HandEvaluator.js';
import { Card } from './Card.js';

// Pre-flop hand strength categories
const PREMIUM_HANDS = ['AA', 'KK', 'QQ', 'AKs', 'AKo'];
const STRONG_HANDS = ['JJ', 'TT', 'AQs', 'AQo', 'AJs', 'KQs'];
const MEDIUM_HANDS = ['99', '88', '77', 'ATs', 'A9s', 'KJs', 'KTs', 'QJs', 'AJo', 'KQo'];

/**
 * Get pre-flop hand category.
 */
function getPreflopStrength(hand) {
    const [c1, c2] = hand;
    const r1 = c1.rank === '10' ? 'T' : c1.rank;
    const r2 = c2.rank === '10' ? 'T' : c2.rank;
    const suited = c1.suit === c2.suit;

    // Pair
    if (r1 === r2) {
        const key = r1 + r2;
        if (PREMIUM_HANDS.includes(key)) return 'premium';
        if (STRONG_HANDS.includes(key)) return 'strong';
        if (MEDIUM_HANDS.includes(key)) return 'medium';
        return 'weak';
    }

    // Non-pair (sort by value)
    const sorted = c1.value >= c2.value ? [r1, r2] : [r2, r1];
    const suffix = suited ? 's' : 'o';
    const key = sorted[0] + sorted[1] + suffix;

    if (PREMIUM_HANDS.includes(key)) return 'premium';
    if (STRONG_HANDS.includes(key)) return 'strong';
    if (MEDIUM_HANDS.includes(key)) return 'medium';
    return 'weak';
}

/**
 * Decide AI action based on game state.
 * @returns {{ type: string, amount?: number }}
 */
export function decideAction(hand, communityCards, gameState, playerId) {
    const validActions = getValidActionsForAI(gameState, playerId);
    const random = Math.random();

    // Pre-flop decision
    if (communityCards.length === 0) {
        return decidePreflopAction(hand, gameState, playerId, validActions, random);
    }

    // Post-flop decision
    return decidePostflopAction(hand, communityCards, gameState, playerId, validActions, random);
}

function decidePreflopAction(hand, gameState, playerId, validActions, random) {
    const strength = getPreflopStrength(hand);
    const currentBet = gameState.currentBet;
    const playerState = gameState.playerStates.find(ps => ps.id === playerId);
    const toCall = currentBet - (playerState?.bet || 0);

    switch (strength) {
        case 'premium':
            // Always raise with premium hands
            if (validActions.includes('raise')) {
                return { type: 'raise', amount: Math.min(currentBet * 3 || 30, getChips(gameState, playerId)) };
            }
            return { type: 'call' };

        case 'strong':
            // Usually raise, sometimes call
            if (random < 0.7 && validActions.includes('raise')) {
                return { type: 'raise', amount: Math.min(currentBet * 2.5 || 25, getChips(gameState, playerId)) };
            }
            return { type: 'call' };

        case 'medium':
            // Call if cheap, fold if facing big raise
            if (toCall > 40) {
                return random < 0.3 ? { type: 'call' } : { type: 'fold' };
            }
            if (validActions.includes('check')) return { type: 'check' };
            return { type: 'call' };

        case 'weak':
        default:
            // Fold most of the time, occasionally limp
            if (validActions.includes('check')) return { type: 'check' };
            if (toCall <= 10 && random < 0.3) return { type: 'call' };
            return { type: 'fold' };
    }
}

function decidePostflopAction(hand, communityCards, gameState, playerId, validActions, random) {
    // Evaluate current hand
    const allCards = [...hand, ...communityCards];
    const evaluation = evaluateHand(allCards);
    const currentBet = gameState.currentBet;
    const playerState = gameState.playerStates.find(ps => ps.id === playerId);
    const toCall = currentBet - (playerState?.bet || 0);
    const chips = getChips(gameState, playerId);

    // Strong hand (two pair or better)
    if (evaluation.rank >= HandRank.TWO_PAIR) {
        // Very strong (flush or better): raise/bet aggressively
        if (evaluation.rank >= HandRank.FLUSH) {
            if (random < 0.8 && validActions.includes('raise')) {
                return { type: 'raise', amount: Math.min(currentBet * 2 + 20, chips) };
            }
            if (validActions.includes('allin') && evaluation.rank >= HandRank.FULL_HOUSE && random < 0.5) {
                return { type: 'allin' };
            }
            return validActions.includes('call') ? { type: 'call' } : { type: 'check' };
        }

        // Medium-strong (two pair, trips): raise moderately
        if (random < 0.6 && validActions.includes('raise')) {
            return { type: 'raise', amount: Math.min(currentBet + 20, chips) };
        }
        if (validActions.includes('check')) return { type: 'check' };
        return { type: 'call' };
    }

    // One pair
    if (evaluation.rank === HandRank.ONE_PAIR) {
        if (toCall > chips * 0.3) {
            return random < 0.2 ? { type: 'call' } : { type: 'fold' };
        }
        if (validActions.includes('check')) return { type: 'check' };
        if (random < 0.4 && validActions.includes('raise')) {
            return { type: 'raise', amount: Math.min(currentBet + 10, chips) };
        }
        return { type: 'call' };
    }

    // High card only
    if (toCall > 20) {
        // Occasional bluff
        if (random < 0.1 && validActions.includes('raise')) {
            return { type: 'raise', amount: Math.min(currentBet * 2, chips) };
        }
        return random < 0.15 ? { type: 'call' } : { type: 'fold' };
    }

    if (validActions.includes('check')) return { type: 'check' };
    return random < 0.4 ? { type: 'call' } : { type: 'fold' };
}

function getValidActionsForAI(gameState, playerId) {
    const playerState = gameState.playerStates.find(ps => ps.id === playerId);
    if (!playerState) return ['fold'];

    const actions = ['fold'];
    if (playerState.bet >= gameState.currentBet) {
        actions.push('check');
    } else {
        actions.push('call');
    }
    actions.push('raise');
    actions.push('allin');
    return actions;
}

function getChips(gameState, playerId) {
    const player = gameState.players.find(p => p.id === playerId);
    return player ? player.chips : 0;
}
