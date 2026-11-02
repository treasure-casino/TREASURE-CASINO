import {
  createStandardDeck,
  createShoe,
  shuffleDeck,
  evaluateHand,
  playDealerTurn,
  determineGameResult,
  calculateInsuranceBet,
  calculateInsurancePayout,
  Card,
  DEFAULT_BLACKJACK_CONFIG,
} from '../blackjackEngine';

describe('Blackjack Engine Unit Tests', () => {
  describe('Deck Generation & Shuffling', () => {
    it('creates a standard 52-card deck with correct suits and ranks', () => {
      const deck = createStandardDeck();
      expect(deck.length).toBe(52);

      const suits = new Set(deck.map((c) => c.suit));
      expect(suits.size).toBe(4);

      const aces = deck.filter((c) => c.isAce);
      expect(aces.length).toBe(4);

      const tens = deck.filter((c) => ['10', 'J', 'Q', 'K'].includes(c.rank));
      expect(tens.length).toBe(16);
    });

    it('creates a multi-deck shoe correctly', () => {
      const shoe = createShoe(6);
      expect(shoe.length).toBe(52 * 6);
    });

    it('shuffles cards without losing or duplicating elements', () => {
      const deck = createStandardDeck();
      const shuffled = shuffleDeck(deck);

      expect(shuffled.length).toBe(52);
      expect(new Set(shuffled.map((c) => c.code)).size).toBe(52);
    });
  });

  describe('evaluateHand Score Calculations', () => {
    it('evaluates numeric non-ace hands correctly', () => {
      const hand: Card[] = [
        { suit: '♠', rank: '7', value: 7, isAce: false, code: '7S' },
        { suit: '♥', rank: '9', value: 9, isAce: false, code: '9H' },
      ];
      const result = evaluateHand(hand);
      expect(result.score).toBe(16);
      expect(result.isSoft).toBe(false);
      expect(result.isBusted).toBe(false);
      expect(result.isBlackjack).toBe(false);
    });

    it('evaluates Natural Blackjack (Ace + 10-value card on 2 cards)', () => {
      const hand: Card[] = [
        { suit: '♠', rank: 'A', value: 11, isAce: true, code: 'AS' },
        { suit: '♦', rank: 'K', value: 10, isAce: false, code: 'KD' },
      ];
      const result = evaluateHand(hand);
      expect(result.score).toBe(21);
      expect(result.isBlackjack).toBe(true);
      expect(result.isBusted).toBe(false);
    });

    it('evaluates soft ace hands (Ace counted as 11)', () => {
      const hand: Card[] = [
        { suit: '♠', rank: 'A', value: 11, isAce: true, code: 'AS' },
        { suit: '♥', rank: '6', value: 6, isAce: false, code: '6H' },
      ];
      const result = evaluateHand(hand);
      expect(result.score).toBe(17);
      expect(result.isSoft).toBe(true);
      expect(result.isBusted).toBe(false);
    });

    it('reduces Ace from 11 to 1 when hand would bust over 21', () => {
      const hand: Card[] = [
        { suit: '♠', rank: 'A', value: 11, isAce: true, code: 'AS' },
        { suit: '♥', rank: '8', value: 8, isAce: false, code: '8H' },
        { suit: '♦', rank: '5', value: 5, isAce: false, code: '5D' },
      ]; // 11 + 8 + 5 = 24 -> Ace reduces to 1: 1 + 8 + 5 = 14
      const result = evaluateHand(hand);
      expect(result.score).toBe(14);
      expect(result.isSoft).toBe(false);
      expect(result.isBusted).toBe(false);
    });

    it('handles multiple Aces properly (e.g. A + A + 9 = 21)', () => {
      const hand: Card[] = [
        { suit: '♠', rank: 'A', value: 11, isAce: true, code: 'AS' },
        { suit: '♥', rank: 'A', value: 11, isAce: true, code: 'AH' },
        { suit: '♦', rank: '9', value: 9, isAce: false, code: '9D' },
      ]; // 11 + 1 + 9 = 21 (3 cards, so 21 but not Natural Blackjack)
      const result = evaluateHand(hand);
      expect(result.score).toBe(21);
      expect(result.isSoft).toBe(true);
      expect(result.isBlackjack).toBe(false);
    });

    it('detects bust when all Aces reduced still exceed 21', () => {
      const hand: Card[] = [
        { suit: '♠', rank: '10', value: 10, isAce: false, code: '10S' },
        { suit: '♥', rank: '8', value: 8, isAce: false, code: '8H' },
        { suit: '♦', rank: '6', value: 6, isAce: false, code: '6D' },
      ]; // 24
      const result = evaluateHand(hand);
      expect(result.score).toBe(24);
      expect(result.isBusted).toBe(true);
    });
  });

  describe('Dealer AI Logic (playDealerTurn)', () => {
    it('dealer stands if starting hand is already 17 or more', () => {
      const dealerCards: Card[] = [
        { suit: '♠', rank: '10', value: 10, isAce: false, code: '10S' },
        { suit: '♦', rank: '8', value: 8, isAce: false, code: '8D' },
      ]; // 18
      const deck: Card[] = [
        { suit: '♥', rank: '5', value: 5, isAce: false, code: '5H' },
      ];

      const { dealerCards: finalDealer, remainingDeck } = playDealerTurn(dealerCards, deck);
      expect(finalDealer.length).toBe(2);
      expect(remainingDeck.length).toBe(1);
    });

    it('dealer draws until reaching at least 17', () => {
      const dealerCards: Card[] = [
        { suit: '♠', rank: '6', value: 6, isAce: false, code: '6S' },
        { suit: '♦', rank: '7', value: 7, isAce: false, code: '7D' },
      ]; // 13
      const deck: Card[] = [
        { suit: '♥', rank: '3', value: 3, isAce: false, code: '3H' }, // 16
        { suit: '♣', rank: '4', value: 4, isAce: false, code: '4C' }, // 20
        { suit: '♦', rank: '9', value: 9, isAce: false, code: '9D' },
      ];

      const { dealerCards: finalDealer, remainingDeck } = playDealerTurn(dealerCards, deck);
      expect(finalDealer.length).toBe(4);
      const evalFinal = evaluateHand(finalDealer);
      expect(evalFinal.score).toBe(20);
      expect(remainingDeck.length).toBe(1);
    });

    it('dealer stops when busting over 21', () => {
      const dealerCards: Card[] = [
        { suit: '♠', rank: '10', value: 10, isAce: false, code: '10S' },
        { suit: '♦', rank: '6', value: 6, isAce: false, code: '6D' },
      ]; // 16
      const deck: Card[] = [
        { suit: '♥', rank: '8', value: 8, isAce: false, code: '8H' }, // 24 (bust)
      ];

      const { dealerCards: finalDealer } = playDealerTurn(dealerCards, deck);
      const evalFinal = evaluateHand(finalDealer);
      expect(evalFinal.score).toBe(24);
      expect(evalFinal.isBusted).toBe(true);
    });
  });

  describe('determineGameResult Outcomes & Multipliers', () => {
    it('returns PLAYER_BUST with 0x multiplier when player busts', () => {
      const playerEval = evaluateHand([
        { suit: '♠', rank: '10', value: 10, isAce: false, code: '10S' },
        { suit: '♥', rank: '6', value: 6, isAce: false, code: '6H' },
        { suit: '♦', rank: '7', value: 7, isAce: false, code: '7D' },
      ]); // 23
      const dealerEval = evaluateHand([
        { suit: '♣', rank: '10', value: 10, isAce: false, code: '10C' },
        { suit: '♠', rank: '8', value: 8, isAce: false, code: '8S' },
      ]); // 18

      const outcome = determineGameResult(playerEval, dealerEval);
      expect(outcome.result).toBe('PLAYER_BUST');
      expect(outcome.payoutMultiplier).toBe(0);
    });

    it('returns PLAYER_BLACKJACK with 2.5x payout on natural blackjack vs normal hand', () => {
      const playerEval = evaluateHand([
        { suit: '♠', rank: 'A', value: 11, isAce: true, code: 'AS' },
        { suit: '♥', rank: 'K', value: 10, isAce: false, code: 'KH' },
      ]); // Natural 21
      const dealerEval = evaluateHand([
        { suit: '♣', rank: '10', value: 10, isAce: false, code: '10C' },
        { suit: '♠', rank: '10', value: 10, isAce: false, code: '10S' },
      ]); // 20

      const outcome = determineGameResult(playerEval, dealerEval);
      expect(outcome.result).toBe('PLAYER_BLACKJACK');
      expect(outcome.payoutMultiplier).toBe(DEFAULT_BLACKJACK_CONFIG.blackjackPayoutMultiplier);
    });

    it('returns PUSH with 1.0x payout when both have Blackjack', () => {
      const playerEval = evaluateHand([
        { suit: '♠', rank: 'A', value: 11, isAce: true, code: 'AS' },
        { suit: '♥', rank: 'K', value: 10, isAce: false, code: 'KH' },
      ]);
      const dealerEval = evaluateHand([
        { suit: '♦', rank: 'A', value: 11, isAce: true, code: 'AD' },
        { suit: '♣', rank: 'Q', value: 10, isAce: false, code: 'QC' },
      ]);

      const outcome = determineGameResult(playerEval, dealerEval);
      expect(outcome.result).toBe('PUSH');
      expect(outcome.payoutMultiplier).toBe(1.0);
    });

    it('returns DEALER_BUST with 2.0x payout when dealer busts', () => {
      const playerEval = evaluateHand([
        { suit: '♠', rank: '10', value: 10, isAce: false, code: '10S' },
        { suit: '♥', rank: '8', value: 8, isAce: false, code: '8H' },
      ]); // 18
      const dealerEval = evaluateHand([
        { suit: '♣', rank: '10', value: 10, isAce: false, code: '10C' },
        { suit: '♠', rank: '6', value: 6, isAce: false, code: '6S' },
        { suit: '♦', rank: '9', value: 9, isAce: false, code: '9D' },
      ]); // 25 (busted)

      const outcome = determineGameResult(playerEval, dealerEval);
      expect(outcome.result).toBe('DEALER_BUST');
      expect(outcome.payoutMultiplier).toBe(2.0);
    });

    it('returns PLAYER_WIN with 2.0x payout when player score > dealer score', () => {
      const playerEval = evaluateHand([
        { suit: '♠', rank: '10', value: 10, isAce: false, code: '10S' },
        { suit: '♥', rank: '9', value: 9, isAce: false, code: '9H' },
      ]); // 19
      const dealerEval = evaluateHand([
        { suit: '♣', rank: '10', value: 10, isAce: false, code: '10C' },
        { suit: '♠', rank: '8', value: 8, isAce: false, code: '8S' },
      ]); // 18

      const outcome = determineGameResult(playerEval, dealerEval);
      expect(outcome.result).toBe('PLAYER_WIN');
      expect(outcome.payoutMultiplier).toBe(2.0);
    });

    it('returns DEALER_WIN with 0x payout when dealer score > player score', () => {
      const playerEval = evaluateHand([
        { suit: '♠', rank: '10', value: 10, isAce: false, code: '10S' },
        { suit: '♥', rank: '7', value: 7, isAce: false, code: '7H' },
      ]); // 17
      const dealerEval = evaluateHand([
        { suit: '♣', rank: '10', value: 10, isAce: false, code: '10C' },
        { suit: '♠', rank: '9', value: 9, isAce: false, code: '9S' },
      ]); // 19

      const outcome = determineGameResult(playerEval, dealerEval);
      expect(outcome.result).toBe('DEALER_WIN');
      expect(outcome.payoutMultiplier).toBe(0);
    });

    it('returns PUSH with 1.0x payout when scores are tied', () => {
      const playerEval = evaluateHand([
        { suit: '♠', rank: '10', value: 10, isAce: false, code: '10S' },
        { suit: '♥', rank: '9', value: 9, isAce: false, code: '9H' },
      ]); // 19
      const dealerEval = evaluateHand([
        { suit: '♣', rank: '9', value: 9, isAce: false, code: '9C' },
        { suit: '♠', rank: '10', value: 10, isAce: false, code: '10S' },
      ]); // 19

      const outcome = determineGameResult(playerEval, dealerEval);
      expect(outcome.result).toBe('PUSH');
      expect(outcome.payoutMultiplier).toBe(1.0);
    });
  });

  describe('Insurance Mechanics', () => {
    it('calculates insurance bet as exactly 50% of original bet', () => {
      expect(calculateInsuranceBet(100)).toBe(50);
      expect(calculateInsuranceBet(50)).toBe(25);
      expect(calculateInsuranceBet(25)).toBe(12.5);
      expect(calculateInsuranceBet(1000)).toBe(500);
    });

    it('calculates insurance payout at 2:1 profit (3x total return of stake + profit)', () => {
      // If insurance bet is 50, 2:1 profit = 100, total payout = 150
      expect(calculateInsurancePayout(50)).toBe(150);
      expect(calculateInsurancePayout(25)).toBe(75);
      expect(calculateInsurancePayout(500)).toBe(1500);
    });
  });
});

