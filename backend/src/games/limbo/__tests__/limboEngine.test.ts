import {
  calculateWinProbability,
  generateLimboMultiplier,
  evaluateLimboRound,
  DEFAULT_LIMBO_CONFIG,
} from '../limboEngine';

describe('Limbo Engine Unit Tests', () => {
  describe('calculateWinProbability', () => {
    it('calculates expected win probability for 2.00x target with 96% RTP', () => {
      // 96 / 2 = 48.00%
      const prob = calculateWinProbability(2.0, 0.96);
      expect(prob).toBe(48.0);
    });

    it('calculates expected win probability for 1.01x target', () => {
      // 96 / 1.01 = 95.0495... -> 95.05%
      const prob = calculateWinProbability(1.01, 0.96);
      expect(prob).toBe(95.05);
    });

    it('calculates expected win probability for high targets', () => {
      // 96 / 100 = 0.96%
      expect(calculateWinProbability(100.0, 0.96)).toBe(0.96);
      // 96 / 1000 = 0.096% -> 0.1%
      expect(calculateWinProbability(1000.0, 0.96)).toBe(0.1);
    });

    it('clamps win probability to 99.00% maximum and 0.01% minimum', () => {
      expect(calculateWinProbability(0.5, 0.96)).toBe(99.0);
      expect(calculateWinProbability(100000.0, 0.96)).toBe(0.01);
    });
  });

  describe('generateLimboMultiplier', () => {
    it('returns forced multiplier when forcedMultiplier is provided', () => {
      const { multiplier } = generateLimboMultiplier(0.96, 10000, 3.5);
      expect(multiplier).toBe(3.5);
    });

    it('clamps forced multiplier within [1.00, maxMultiplier]', () => {
      const under = generateLimboMultiplier(0.96, 10000, 0.5);
      expect(under.multiplier).toBe(1.0);

      const over = generateLimboMultiplier(0.96, 500, 1500);
      expect(over.multiplier).toBe(500.0);
    });

    it('generates random multipliers within valid boundaries', () => {
      for (let i = 0; i < 50; i++) {
        const { multiplier, rawRandom } = generateLimboMultiplier(0.96, 10000);
        expect(multiplier).toBeGreaterThanOrEqual(1.0);
        expect(multiplier).toBeLessThanOrEqual(10000.0);
        expect(rawRandom).toBeGreaterThan(0);
        expect(rawRandom).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('evaluateLimboRound', () => {
    it('correctly identifies a WIN when resultMultiplier >= targetMultiplier', () => {
      const result = evaluateLimboRound(
        'round-1',
        100,
        2.0,
        DEFAULT_LIMBO_CONFIG,
        2.5 // forced result >= 2.0
      );

      expect(result.isWin).toBe(true);
      expect(result.resultMultiplier).toBe(2.5);
      expect(result.targetMultiplier).toBe(2.0);
      expect(result.payout).toBe(200.0); // 100 * 2.0
      expect(result.netProfit).toBe(100.0);
    });

    it('correctly identifies a WIN on exact boundary match', () => {
      const result = evaluateLimboRound(
        'round-2',
        50,
        3.0,
        DEFAULT_LIMBO_CONFIG,
        3.0 // exact match
      );

      expect(result.isWin).toBe(true);
      expect(result.payout).toBe(150.0);
      expect(result.netProfit).toBe(100.0);
    });

    it('correctly identifies a LOSE when resultMultiplier < targetMultiplier', () => {
      const result = evaluateLimboRound(
        'round-3',
        100,
        2.0,
        DEFAULT_LIMBO_CONFIG,
        1.99 // forced result < 2.0
      );

      expect(result.isWin).toBe(false);
      expect(result.resultMultiplier).toBe(1.99);
      expect(result.payout).toBe(0);
      expect(result.netProfit).toBe(-100.0);
    });

    it('handles low target 1.01x accurately', () => {
      const winResult = evaluateLimboRound('round-4', 200, 1.01, DEFAULT_LIMBO_CONFIG, 1.01);
      expect(winResult.isWin).toBe(true);
      expect(winResult.payout).toBe(202.0); // 200 * 1.01

      const lossResult = evaluateLimboRound('round-5', 200, 1.01, DEFAULT_LIMBO_CONFIG, 1.0);
      expect(lossResult.isWin).toBe(false);
      expect(lossResult.payout).toBe(0);
    });

    it('handles high target 100.0x accurately', () => {
      const highWin = evaluateLimboRound('round-6', 10, 100.0, DEFAULT_LIMBO_CONFIG, 150.0);
      expect(highWin.isWin).toBe(true);
      expect(highWin.payout).toBe(1000.0); // 10 * 100
      expect(highWin.netProfit).toBe(990.0);
    });
  });
});

