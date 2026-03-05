# Poker Easter Egg Design

## Goal Description
Introduce a special "Easter Egg" feature where players can input specific chat commands (e.g., `/debug-royal`) to guarantee they are dealt a very strong hand (like a Royal Flush) in the next round. The Easter egg should be configurable per player and remain active until `/debug-off` is called. The required community cards should be distributed randomly among the Flop, Turn, and River so it doesn't look completely rigged (e.g., getting all 3 cards exactly on the Flop).

## Proposed Approaches & Selected Solution
**Selected Solution: Pre-arranged Deck Scripting (Scheme 1)**
When a round starts, if a player has an active easter egg queued, the `GameEngine` will intercept the normal dealing process:
1. Extract specific cards from the `Deck` to form the desired hand.
2. Deal the core 2 cards to the target player's hand.
3. Extract the remaining 3 cards (required for the hand combination).
4. Extract 2 additional random cards from the deck.
5. Shuffle these 5 cards together.
6. Place these 5 cards at the top of the deck.
7. Normal random dealing resumes for other players.

By shuffling the 3 required cards with 2 random cards and placing them at the top, the 5 community cards over the Flop, Turn, and River will exactly be these 5 cards, but the order will be random. This ensures the player still hits their hand by the River, but the suspense is maintained.

### Chat Commands
*   `/debug-royal`: Guarantees a Royal Flush.
*   `/debug-straightflush`: Guarantees a Straight Flush.
*   `/debug-fourofakind`: Guarantees Four of a Kind.
*   `/debug-off`: Cancels the active easter egg.

## Architecture & Data Flow

### Deck Manipulation (`GameEngine.js` & `Deck.js`)
*   Add a method `deck.extractCard(suit, rank)` to manually pull specific cards from the deck.
*   In `GameEngine.startRound()`, before dealing the initial 2 cards to players, check if `options.easterEgg` exists.
*   If so, define the target cards based on the command type.
*   Deal the 2 hole cards to the specific player.
*   Extract the 3 required community cards.
*   Draw 2 random cards from the deck.
*   Combine the 3 required and 2 random cards into an array, shuffle it, and push it to the top of the deck.

## Proposed Changes

### `server/game/GameEngine.js`
#### [MODIFY] `GameEngine.js`
*   In `startRound`, update the Easter Egg logic:
    *   Instead of placing just the 3 required community cards at the top, also extract 2 random cards (`this.deck.dealMany(2)`).
    *   Combine them into a 5-card array.
    *   Shuffle the 5-card array.
    *   Push them to the top of the deck using `placeAtTop()`.
