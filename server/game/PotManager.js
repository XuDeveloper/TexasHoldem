/**
 * Pot Manager
 * Handles main pot and side pot calculations for all-in scenarios.
 */

export class PotManager {
    constructor() {
        this.pots = []; // Array of { amount, eligiblePlayerIds }
    }

    /**
     * Calculate pots from player bets.
     * @param {Array<{id: string, totalBet: number, folded: boolean}>} players
     */
    calculatePots(players) {
        // Filter out players with zero bets
        const bettors = players
            .filter(p => p.totalBet > 0)
            .map(p => ({ ...p }))
            .sort((a, b) => a.totalBet - b.totalBet);

        this.pots = [];
        let processedBet = 0;

        while (bettors.length > 0) {
            const minBet = bettors[0].totalBet;
            const contribution = minBet - processedBet;

            if (contribution > 0) {
                // All remaining bettors contribute to this pot
                const potAmount = contribution * bettors.length;
                // Eligible = non-folded players who contributed to this pot level
                const eligiblePlayerIds = bettors
                    .filter(p => !p.folded)
                    .map(p => p.id);

                this.pots.push({
                    amount: potAmount,
                    eligiblePlayerIds,
                });
            }

            processedBet = minBet;

            // Remove players whose total bet is fully accounted for
            while (bettors.length > 0 && bettors[0].totalBet <= processedBet) {
                bettors.shift();
            }
        }

        return this.pots;
    }

    /**
     * Get total pot amount.
     */
    getTotal() {
        return this.pots.reduce((sum, pot) => sum + pot.amount, 0);
    }

    /**
     * Distribute winnings based on hand rankings.
     * @param {Array<{id: string, handEval: object}>} playerHands - evaluated hands for non-folded players
     * @param {Function} compareFn - hand comparison function
     * @returns {Object} Map of playerId -> winnings
     */
    distributeWinnings(playerHands, compareFn) {
        const winnings = {};

        for (const pot of this.pots) {
            // Find eligible players that have hand evaluations
            const eligible = playerHands.filter(p => pot.eligiblePlayerIds.includes(p.id));

            if (eligible.length === 0) continue;

            // Sort by hand strength descending
            eligible.sort((a, b) => compareFn(b.handEval, a.handEval));

            // Find all winners (handle ties)
            const bestHand = eligible[0].handEval;
            const winners = eligible.filter(p => compareFn(p.handEval, bestHand) === 0);

            // Split pot among winners
            const share = Math.floor(pot.amount / winners.length);
            const remainder = pot.amount - share * winners.length;

            winners.forEach((winner, i) => {
                winnings[winner.id] = (winnings[winner.id] || 0) + share;
                // Give remainder chips to first winner (closest to dealer)
                if (i === 0) {
                    winnings[winner.id] += remainder;
                }
            });
        }

        return winnings;
    }

    reset() {
        this.pots = [];
    }
}
