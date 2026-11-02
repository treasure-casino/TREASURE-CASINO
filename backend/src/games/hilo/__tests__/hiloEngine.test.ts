import {
  createDeck,
  calculateNextMultipliers,
  evaluateHiloPrediction,
  validateHiloBet,
  validateHiloPredictionAction,
  DEFAULT_HILO_CONFIG,
  HiloCard,
  RANK_VALUES,
} from '../hiloEngine';

describe('Hilo Engine Unit Tests', () => {
  describe('createDeck and card values', () => {
    test('creates a standard 52-card deck with correct ranks and values', () => {
      const deck = createDeck();
      expect(deck).toHaveLength(52);

      // Check card value mappings
      expect(RANK_VALUES['2']).toBe(2);
      expect(RANK_VALUES['10']).toBe(10);
      expect(RANK_VALUES['J']).toBe(11);
      expect(RANK_VALUES['Q']).toBe(12);
      expect(RANK_VALUES['K']).toBe(13);
      expect(RANK_VALUES['A']).toBe(14);

      deck.forEach((card) => {
        expect(card.value).toBeGreaterThanOrEqual(2);
        expect(card.value).toBeLessThanOrEqual(14);
      });
    });
  });

  describe('calculateNextMultipliers', () => {
    test('boundary: card 2 has no lower multiplier and high win chance for higher', () => {
      const card2: HiloCard = { suit: '♠', rank: '2', value: 2, code: '2♠' };
      const mults = calculateNextMultipliers(card2, DEFAULT_HILO_CONFIG);
      expect(mults.lowerMultiplier).toBeNull();
      expect(mults.higherMultiplier).toBeGreaterThanOrEqual(1.05);
      expect(mults.sameMultiplier).toBeGreaterThan(10);
      expect(mults.higherWinChance).toBe(100); // 12/12 = 100%
      expect(mults.lowerWinChance).toBe(0);
    });

    test('boundary: Ace (14) has no higher multiplier and high win chance for lower', () => {
      const cardAce: HiloCard = { suit: '♥', rank: 'A', value: 14, code: 'A♥' };
      const mults = calculateNextMultipliers(cardAce, DEFAULT_HILO_CONFIG);
      expect(mults.higherMultiplier).toBeNull();
      expect(mults.lowerMultiplier).toBeGreaterThanOrEqual(1.05);
      expect(mults.sameMultiplier).toBeGreaterThan(10);
      expect(mults.lowerWinChance).toBe(100);
      expect(mults.higherWinChance).toBe(0);
    });

    test('mid-card: 8 has symmetric higher and lower multipliers', () => {
      const card8: HiloCard = { suit: '♦', rank: '8', value: 8, code: '8♦' };
      const mults = calculateNextMultipliers(card8, DEFAULT_HILO_CONFIG);
      expect(mults.higherMultiplier).toBe(mults.lowerMultiplier);
      expect(mults.higherWinChance).toBe(50.0);
      expect(mults.lowerWinChance).toBe(50.0);
    });
  });

  describe('evaluateHiloPrediction', () => {
    const card7: HiloCard = { suit: '♠', rank: '7', value: 7, code: '7♠' };
    const card10: HiloCard = { suit: '♥', rank: '10', value: 10, code: '10♥' };
    const card4: HiloCard = { suit: '♦', rank: '4', value: 4, code: '4♦' };
    const card7Club: HiloCard = { suit: '♣', rank: '7', value: 7, code: '7♣' };

    test('evaluates HIGHER correctly', () => {
      // 7 -> 10 (Higher) with HIGHER prediction = WIN
      const win = evaluateHiloPrediction(card7, card10, 'HIGHER');
      expect(win.outcome).toBe('WIN');
      expect(win.stepMultiplier).toBeGreaterThan(1.0);

      // 7 -> 4 (Lower) with HIGHER prediction = LOSS
      const loss = evaluateHiloPrediction(card7, card4, 'HIGHER');
      expect(loss.outcome).toBe('LOSS');
      expect(loss.stepMultiplier).toBe(0);
    });

    test('evaluates LOWER correctly', () => {
      // 7 -> 4 (Lower) with LOWER prediction = WIN
      const win = evaluateHiloPrediction(card7, card4, 'LOWER');
      expect(win.outcome).toBe('WIN');
      expect(win.stepMultiplier).toBeGreaterThan(1.0);

      // 7 -> 10 (Higher) with LOWER prediction = LOSS
      const loss = evaluateHiloPrediction(card7, card10, 'LOWER');
      expect(loss.outcome).toBe('LOSS');
      expect(loss.stepMultiplier).toBe(0);
    });

    test('evaluates PUSH correctly on equal rank for HIGHER or LOWER', () => {
      const pushHigher = evaluateHiloPrediction(card7, card7Club, 'HIGHER');
      expect(pushHigher.outcome).toBe('PUSH');
      expect(pushHigher.stepMultiplier).toBe(1.0);

      const pushLower = evaluateHiloPrediction(card7, card7Club, 'LOWER');
      expect(pushLower.outcome).toBe('PUSH');
      expect(pushLower.stepMultiplier).toBe(1.0);
    });

    test('evaluates SAME correctly', () => {
      // 7 -> 7 with SAME prediction = WIN
      const winSame = evaluateHiloPrediction(card7, card7Club, 'SAME');
      expect(winSame.outcome).toBe('WIN');
      expect(winSame.stepMultiplier).toBeGreaterThan(10);

      // 7 -> 10 with SAME prediction = LOSS
      const lossSame = evaluateHiloPrediction(card7, card10, 'SAME');
      expect(lossSame.outcome).toBe('LOSS');
      expect(lossSame.stepMultiplier).toBe(0);
    });
  });

  describe('validation', () => {
    test('validates bet bounds', () => {
      expect(validateHiloBet(10).isValid).toBe(true);
      expect(validateHiloBet(5000).isValid).toBe(true);
      expect(validateHiloBet(5).isValid).toBe(false);
      expect(validateHiloBet(10000).isValid).toBe(false);
    });

    test('validates action boundaries on Ace and 2', () => {
      const cardAce: HiloCard = { suit: '♠', rank: 'A', value: 14, code: 'A♠' };
      const card2: HiloCard = { suit: '♥', rank: '2', value: 2, code: '2♥' };
      const card8: HiloCard = { suit: '♦', rank: '8', value: 8, code: '8♦' };

      // Ace cannot predict HIGHER
      expect(validateHiloPredictionAction(cardAce, 'HIGHER').isValid).toBe(false);
      expect(validateHiloPredictionAction(cardAce, 'LOWER').isValid).toBe(true);

      // 2 cannot predict LOWER
      expect(validateHiloPredictionAction(card2, 'LOWER').isValid).toBe(false);
      expect(validateHiloPredictionAction(card2, 'HIGHER').isValid).toBe(true);

      // 8 can predict both
      expect(validateHiloPredictionAction(card8, 'HIGHER').isValid).toBe(true);
      expect(validateHiloPredictionAction(card8, 'LOWER').isValid).toBe(true);
    });
  });
});

