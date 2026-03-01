/**
 * Texas Hold'em Game Engine
 * Manages a single game round: dealing, betting, phase advancement, and showdown.
 */

import { Deck } from './Deck.js';
import { evaluateHand, compareHands } from './HandEvaluator.js';
import { PotManager } from './PotManager.js';

export const Phase = {
    WAITING: 'waiting',
    PREFLOP: 'preflop',
    FLOP: 'flop',
    TURN: 'turn',
    RIVER: 'river',
    SHOWDOWN: 'showdown',
};

export const PlayerStatus = {
    ACTIVE: 'active',
    FOLDED: 'folded',
    ALLIN: 'allin',
};

export class GameEngine {
    constructor(players, options = {}) {
        this.players = players;

        this.smallBlind = options.smallBlind || 5;
        this.bigBlind = options.bigBlind || 10;
        this.turnTimeout = options.turnTimeout || 30000;

        this.deck = new Deck();
        this.potManager = new PotManager();
        this.communityCards = [];
        this.phase = Phase.WAITING;
        this.dealerIndex = options.dealerIndex || 0;
        this.currentPlayerIndex = -1;
        this.currentBet = 0;
        this.playerStates = [];
        this.winners = null;
        this.lastAction = null;
    }

    /**
     * Start a new round.
     */
    startRound() {
        // Reset deck and shuffle
        this.deck.reset();
        this.deck.shuffle();

        this.communityCards = [];
        this.potManager.reset();
        this.winners = null;
        this.lastAction = null;

        // Initialize player states for this round
        this.playerStates = this.players
            .filter(p => p.chips > 0)
            .map(p => ({
                id: p.id,
                hand: [],
                bet: 0,
                totalBet: 0,
                status: PlayerStatus.ACTIVE,
                hasActed: false,
            }));

        if (this.playerStates.length < 2) {
            throw new Error('Need at least 2 players with chips to start');
        }

        // Deal 2 cards to each player
        for (const ps of this.playerStates) {
            ps.hand = this.deck.dealMany(2);
        }

        // Post blinds
        this.postBlinds();

        // Set phase to preflop
        this.phase = Phase.PREFLOP;

        // Set current player (after big blind)
        const activePlayers = this.getActivePlayers();
        if (activePlayers.length <= 3) {
            // Heads-up or 3-player: small blind acts first preflop
            // Actually in heads-up, dealer is small blind and acts first preflop
            this.currentPlayerIndex = this.getNextActiveIndex(this.getBigBlindIndex());
        } else {
            this.currentPlayerIndex = this.getNextActiveIndex(this.getBigBlindIndex());
        }

        return this.getState();
    }

    /**
     * Post small and big blinds.
     */
    postBlinds() {
        const sbIndex = this.getSmallBlindIndex();
        const bbIndex = this.getBigBlindIndex();

        const sbPlayer = this.playerStates[sbIndex];
        const bbPlayer = this.playerStates[bbIndex];

        const sbAmount = Math.min(this.smallBlind, this.getPlayerChips(sbPlayer.id));
        const bbAmount = Math.min(this.bigBlind, this.getPlayerChips(bbPlayer.id));

        this.placeBet(sbPlayer, sbAmount);
        this.placeBet(bbPlayer, bbAmount);

        this.currentBet = bbAmount;
    }

    getSmallBlindIndex() {
        if (this.playerStates.length === 2) {
            return this.dealerIndex % this.playerStates.length;
        }
        return (this.dealerIndex + 1) % this.playerStates.length;
    }

    getBigBlindIndex() {
        if (this.playerStates.length === 2) {
            return (this.dealerIndex + 1) % this.playerStates.length;
        }
        return (this.dealerIndex + 2) % this.playerStates.length;
    }

    /**
     * Handle a player action.
     * @returns {object} Updated game state
     */
    handleAction(playerId, action) {
        const playerState = this.playerStates[this.currentPlayerIndex];

        if (!playerState || playerState.id !== playerId) {
            throw new Error('Not your turn');
        }

        if (playerState.status !== PlayerStatus.ACTIVE) {
            throw new Error('Player cannot act');
        }

        const player = this.players.find(p => p.id === playerId);

        switch (action.type) {
            case 'fold':
                playerState.status = PlayerStatus.FOLDED;
                break;

            case 'check':
                if (playerState.bet < this.currentBet) {
                    throw new Error('Cannot check, must call or raise');
                }
                break;

            case 'call': {
                const callAmount = Math.min(
                    this.currentBet - playerState.bet,
                    player.chips
                );
                this.placeBet(playerState, callAmount);
                if (player.chips === 0) {
                    playerState.status = PlayerStatus.ALLIN;
                }
                break;
            }

            case 'raise': {
                if (typeof action.amount !== 'number' || isNaN(action.amount) || action.amount <= 0) {
                    throw new Error('Invalid raise amount');
                }
                if (action.amount % 5 !== 0) {
                    throw new Error('Raise amount must be a multiple of 5');
                }

                const raiseTotal = action.amount; // This is the total bet the player wants to make
                if (raiseTotal <= this.currentBet) {
                    throw new Error('Raise must be greater than current bet');
                }
                const raiseAmount = Math.min(raiseTotal - playerState.bet, player.chips);
                this.placeBet(playerState, raiseAmount);
                this.currentBet = playerState.bet;
                // When someone raises, everyone else needs to act again
                for (const ps of this.playerStates) {
                    if (ps.id !== playerId && ps.status === PlayerStatus.ACTIVE) {
                        ps.hasActed = false;
                    }
                }
                if (player.chips === 0) {
                    playerState.status = PlayerStatus.ALLIN;
                }
                break;
            }

            case 'allin': {
                const allInAmount = player.chips;
                this.placeBet(playerState, allInAmount);
                if (playerState.bet > this.currentBet) {
                    this.currentBet = playerState.bet;
                    // When someone raises via all-in, everyone else needs to act again
                    for (const ps of this.playerStates) {
                        if (ps.id !== playerId && ps.status === PlayerStatus.ACTIVE) {
                            ps.hasActed = false;
                        }
                    }
                }
                playerState.status = PlayerStatus.ALLIN;
                break;
            }

            default:
                throw new Error(`Unknown action: ${action.type}`);
        }

        playerState.hasActed = true;
        this.lastAction = { playerId, ...action };

        // Check if only one player remains (all others folded)
        const activePlayers = this.playerStates.filter(
            ps => ps.status !== PlayerStatus.FOLDED
        );

        if (activePlayers.length === 1) {
            // Everyone else folded, last player wins
            return this.endRoundByFold(activePlayers[0]);
        }

        // Check if betting round is complete
        if (this.isBettingRoundComplete()) {
            return this.advancePhase();
        }

        // Move to next player
        this.currentPlayerIndex = this.getNextActiveIndex(this.currentPlayerIndex);

        return this.getState();
    }

    /**
     * Place a bet for a player.
     */
    placeBet(playerState, amount) {
        const player = this.players.find(p => p.id === playerState.id);
        const actualAmount = Math.min(amount, player.chips);
        player.chips -= actualAmount;
        playerState.bet += actualAmount;
        playerState.totalBet += actualAmount;
    }

    /**
     * Check if the current betting round is complete.
     */
    isBettingRoundComplete() {
        const activePlayers = this.playerStates.filter(
            ps => ps.status === PlayerStatus.ACTIVE
        );

        // If 0 or 1 active players, round is complete
        if (activePlayers.length <= 1) return true;

        // All active players must have acted AND matched the current bet
        return activePlayers.every(ps => ps.hasActed && ps.bet === this.currentBet);
    }

    /**
     * Advance to the next phase.
     */
    advancePhase() {
        // Reset bets and hasActed for new betting round
        for (const ps of this.playerStates) {
            ps.bet = 0;
            ps.hasActed = false;
        }
        this.currentBet = 0;

        // Check if only allin/folded players remain (no more action possible)
        const canAct = this.playerStates.filter(ps => ps.status === PlayerStatus.ACTIVE);

        switch (this.phase) {
            case Phase.PREFLOP:
                this.phase = Phase.FLOP;
                this.communityCards.push(...this.deck.dealMany(3));
                break;
            case Phase.FLOP:
                this.phase = Phase.TURN;
                this.communityCards.push(this.deck.deal());
                break;
            case Phase.TURN:
                this.phase = Phase.RIVER;
                this.communityCards.push(this.deck.deal());
                break;
            case Phase.RIVER:
                return this.showdown();
        }

        // If less than 2 players can act, skip to showdown by dealing remaining cards
        if (canAct.length < 2) {
            return this.dealRemainingAndShowdown();
        }

        // Set current player to first active after dealer
        this.currentPlayerIndex = this.getNextActiveIndex(this.dealerIndex - 1);

        return this.getState();
    }

    /**
     * Deal remaining community cards and go to showdown.
     */
    dealRemainingAndShowdown() {
        while (this.communityCards.length < 5) {
            if (this.phase === Phase.PREFLOP || this.phase === Phase.FLOP) {
                if (this.communityCards.length === 0) {
                    this.communityCards.push(...this.deck.dealMany(3));
                    this.phase = Phase.FLOP;
                } else if (this.communityCards.length === 3) {
                    this.communityCards.push(this.deck.deal());
                    this.phase = Phase.TURN;
                } else if (this.communityCards.length === 4) {
                    this.communityCards.push(this.deck.deal());
                    this.phase = Phase.RIVER;
                }
            } else if (this.phase === Phase.TURN) {
                this.communityCards.push(this.deck.deal());
                this.phase = Phase.RIVER;
            } else {
                break;
            }
        }
        return this.showdown();
    }

    /**
     * End round because all but one player folded.
     */
    endRoundByFold(winner) {
        this.phase = Phase.SHOWDOWN;

        // Calculate pots
        const potData = this.playerStates.map(ps => ({
            id: ps.id,
            totalBet: ps.totalBet,
            folded: ps.status === PlayerStatus.FOLDED,
        }));
        this.potManager.calculatePots(potData);

        // Winner gets everything
        const totalPot = this.potManager.getTotal();
        const player = this.players.find(p => p.id === winner.id);
        player.chips += totalPot;

        this.winners = [{
            id: winner.id,
            name: player.name,
            amount: totalPot,
            hand: null,
            handName: 'Everyone folded',
        }];

        return this.getState();
    }

    /**
     * Showdown: evaluate hands and distribute pot.
     */
    showdown() {
        this.phase = Phase.SHOWDOWN;

        // Calculate pots
        const potData = this.playerStates.map(ps => ({
            id: ps.id,
            totalBet: ps.totalBet,
            folded: ps.status === PlayerStatus.FOLDED,
        }));
        this.potManager.calculatePots(potData);

        // Evaluate hands for non-folded players
        const playerHands = this.playerStates
            .filter(ps => ps.status !== PlayerStatus.FOLDED)
            .map(ps => ({
                id: ps.id,
                handEval: evaluateHand([...ps.hand, ...this.communityCards]),
            }));

        // Distribute winnings
        const winnings = this.potManager.distributeWinnings(playerHands, compareHands);

        // Apply winnings
        this.winners = [];
        for (const [playerId, amount] of Object.entries(winnings)) {
            const player = this.players.find(p => p.id === playerId);
            player.chips += amount;
            const hand = playerHands.find(ph => ph.id === playerId);
            this.winners.push({
                id: playerId,
                name: player.name,
                amount,
                hand: hand?.handEval?.cards || null,
                handName: hand?.handEval?.name || '',
            });
        }

        return this.getState();
    }

    /**
     * Get index of next active player.
     */
    getNextActiveIndex(fromIndex) {
        const len = this.playerStates.length;
        for (let i = 1; i <= len; i++) {
            const idx = (fromIndex + i) % len;
            if (this.playerStates[idx].status === PlayerStatus.ACTIVE) {
                return idx;
            }
        }
        return -1;
    }

    /**
     * Get active players (not folded).
     */
    getActivePlayers() {
        return this.playerStates.filter(ps => ps.status !== PlayerStatus.FOLDED);
    }

    /**
     * Get chips for a player by id.
     */
    getPlayerChips(playerId) {
        const player = this.players.find(p => p.id === playerId);
        return player ? player.chips : 0;
    }

    /**
     * Get full game state (for server use).
     */
    getState() {
        return {
            phase: this.phase,
            communityCards: this.communityCards.map(c => c.toJSON()),
            pot: this.potManager.getTotal() || this.playerStates.reduce((s, ps) => s + ps.totalBet, 0),
            currentPlayerIndex: this.currentPlayerIndex,
            currentPlayerId: this.playerStates[this.currentPlayerIndex]?.id || null,
            currentBet: this.currentBet,
            dealerIndex: this.dealerIndex,
            playerStates: this.playerStates.map(ps => ({
                id: ps.id,
                bet: ps.bet,
                totalBet: ps.totalBet,
                status: ps.status,
                hasCards: ps.hand.length > 0,
            })),
            players: this.players.map(p => ({
                id: p.id,
                name: p.name,
                chips: p.chips,
                isAI: p.isAI,
                aggressiveness: p.aggressiveness,
            })),
            winners: this.winners,
            lastAction: this.lastAction,
        };
    }

    /**
     * Get state visible to a specific player (includes their hand).
     */
    getStateForPlayer(playerId) {
        const state = this.getState();
        const ps = this.playerStates.find(p => p.id === playerId);
        if (ps) {
            state.hand = ps.hand.map(c => c.toJSON());
        }
        return state;
    }

    /**
     * Get valid actions for the current player.
     */
    getValidActions() {
        const ps = this.playerStates[this.currentPlayerIndex];
        if (!ps || ps.status !== PlayerStatus.ACTIVE) return [];

        const player = this.players.find(p => p.id === ps.id);
        const actions = ['fold'];

        if (ps.bet >= this.currentBet) {
            actions.push('check');
        } else {
            actions.push('call');
        }

        if (player.chips > this.currentBet - ps.bet) {
            actions.push('raise');
        }

        actions.push('allin');

        return actions;
    }
}
