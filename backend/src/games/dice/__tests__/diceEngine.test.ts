import {
  calculateDiceWinChance,
  calculateDiceMultiplier,
  generateDiceOutcome,
  evaluateDiceRound,
  DEFAULT_DICE_CONFIG,
} from '../diceEngine';

describe('Dice Engine Unit Tests', () => {
  describe('calculateDiceWinChance', () => {
    it('calculates ROLL_UNDER win chance equal to target', () => {
      expect(calculateDiceWinChance(50.0, 'ROLL_UNDER')).toBe(50.0);
      expect(calculateDiceWinChance(25.0, 'ROLL_UNDER')).toBe(25.0);
      expect(calculateDiceWinChance(2.0, 'ROLL_UNDER')).toBe(2.0);
    });

    it('calculates ROLL_OVER win chance equal to 100 - target', () => {
      expect(calculateDiceWinChance(50.0, 'ROLL_OVER')).toBe(50.0);
      expect(calculateDiceWinChance(75.0, 'ROLL_OVER')).toBe(25.0);
      expect(calculateDiceWinChance(98.0, 'ROLL_OVER')).toBe(2.0);
    });

    it('clamps win chance between 2.00% and 98.00%', () => {
      expect(calculateDiceWinChance(0.5, 'ROLL_UNDER')).toBe(2.0);
      expect(calculateDiceWinChance(99.9, 'ROLL_UNDER')).toBe(98.0);
    });
  });

  describe('calculateDiceMultiplier', () => {
    it('calculates 1.92x multiplier for 50.00% win chance with 96% RTP', () => {
      // 96 / 50 = 1.92x
      const mult = calculateDiceMultiplier(50.0, 'ROLL_UNDER', 0.96);
      expect(mult).toBe(1.92);
    });

    it('calculates high multiplier for low target roll under (high risk)', () => {
      // 96 / 2 = 48.00x
      const mult = calculateDiceMultiplier(2.0, 'ROLL_UNDER', 0.96);
      expect(mult).toBe(48.0);
    });

    it('calculates low multiplier for high target roll under (low risk)', () => {
      // 96 / 95 = 1.01x
      const mult = calculateDiceMultiplier(95.0, 'ROLL_UNDER', 0.96);
      expect(mult).toBe(1.01);
    });
  });

  describe('generateDiceOutcome', () => {
    it('returns forced outcome when provided', () => {
      const { outcome } = generateDiceOutcome(42.5);
      expect(outcome).toBe(42.5);
    });

    it('clamps forced outcome to [0.00, 99.99]', () => {
      expect(generateDiceOutcome(-5).outcome).toBe(0.0);
      expect(generateDiceOutcome(150).outcome).toBe(99.99);
    });

    it('generates random outcomes within valid [0.00, 99.99] bounds', () => {
      for (let i = 0; i < 50; i++) {
        const { outcome, rawRandom } = generateDiceOutcome();
        expect(outcome).toBeGreaterThanOrEqual(0.0);
        expect(outcome).toBeLessThanOrEqual(99.99);
        expect(rawRandom).toBeGreaterThanOrEqual(0);
        expect(rawRandom).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('evaluateDiceRound', () => {
    it('ROLL_UNDER: wins when outcome < target', () => {
      const res = evaluateDiceRound('round-1', 100, 50.0, 'ROLL_UNDER', DEFAULT_DICE_CONFIG, 25.5);
      expect(res.isWin).toBe(true);
      expect(res.outcome).toBe(25.5);
      expect(res.multiplier).toBe(1.92);
      expect(res.payout).toBe(192.0);
      expect(res.netProfit).toBe(92.0);
    });

    it('ROLL_UNDER: loses when outcome >= target', () => {
      const res = evaluateDiceRound('round-2', 100, 50.0, 'ROLL_UNDER', DEFAULT_DICE_CONFIG, 50.0);
      expect(res.isWin).toBe(false);
      expect(res.payout).toBe(0);
      expect(res.netProfit).toBe(-100);
    });

    it('ROLL_OVER: wins when outcome > target', () => {
      const res = evaluateDiceRound('round-3', 100, 50.0, 'ROLL_OVER', DEFAULT_DICE_CONFIG, 75.0);
      expect(res.isWin).toBe(true);
      expect(res.payout).toBe(192.0);
      expect(res.netProfit).toBe(92.0);
    });

    it('ROLL_OVER: loses when outcome <= target', () => {
      const res = evaluateDiceRound('round-4', 100, 50.0, 'ROLL_OVER', DEFAULT_DICE_CONFIG, 50.0);
      expect(res.isWin).toBe(false);
      expect(res.payout).toBe(0);
    });
  });
});

