import {
  DEFAULT_KENO_CONFIG,
  DEFAULT_KENO_PAYOUT_TABLE,
  drawKenoNumbers,
  evaluateKenoRound,
  validateKenoBet,
} from '../kenoEngine';

describe('Keno Engine Unit Tests', () => {
  describe('drawKenoNumbers', () => {
    test('draws exactly 20 unique numbers between 1 and 80', () => {
      const drawn = drawKenoNumbers(20, 80);
      expect(drawn).toHaveLength(20);

      // Check all between 1 and 80
      drawn.forEach((n) => {
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(80);
        expect(Number.isInteger(n)).toBe(true);
      });

      // Check all unique
      const uniqueSet = new Set(drawn);
      expect(uniqueSet.size).toBe(20);
    });

    test('respects forcedDraw parameter for deterministic testing', () => {
      const forced = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
      const drawn = drawKenoNumbers(20, 80, forced);
      expect(drawn).toEqual(forced);
    });
  });

  describe('evaluateKenoRound', () => {
    test('calculates correct matches, payouts, and profits for 10-spot round', () => {
      const selected = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      // 5 matches: 1, 2, 3, 4, 5
      const forced = [1, 2, 3, 4, 5, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35];

      const res = evaluateKenoRound('rnd_keno_1', 100, selected, DEFAULT_KENO_CONFIG, forced);
      expect(res.roundId).toBe('rnd_keno_1');
      expect(res.matchCount).toBe(5);
      expect(res.matches).toEqual([1, 2, 3, 4, 5]);
      expect(res.multiplier).toBe(3.3); // 10 spots, 5 hits = 3.30x
      expect(res.payout).toBe(330);
      expect(res.profit).toBe(230);
      expect(res.isWin).toBe(true);
    });

    test('verifies every single multiplier entry for selected numbers 1 through 10', () => {
      const expectedFullTable: Record<number, Record<number, number>> = {
        1: { 1: 3.49 },
        2: { 1: 1.5, 2: 4.92 },
        3: { 1: 1.0, 2: 2.30, 3: 8.20 },
        4: { 1: 0.5, 2: 1.82, 3: 4.20, 4: 21.0 },
        5: { 1: 0, 2: 1.10, 3: 3.75, 4: 15.0, 5: 35.0 },
        6: { 1: 0, 2: 0.5, 3: 2.90, 4: 7.60, 5: 18.0, 6: 55.0 },
        7: { 1: 0, 2: 0.25, 3: 2.30, 4: 4.10, 5: 10.0, 6: 31.0, 7: 60.0 },
        8: { 1: 0, 2: 0, 3: 1.40, 4: 2.80, 5: 11.40, 6: 28.0, 7: 40.0, 8: 70.0 },
        9: { 1: 0, 2: 0, 3: 1.0, 4: 2.20, 5: 6.10, 6: 17.0, 7: 25.0, 8: 55.0, 9: 85.0 },
        10: { 1: 0, 2: 0, 3: 1.0, 4: 1.5, 5: 3.30, 6: 10.20, 7: 25.0, 8: 40.0, 9: 75.0, 10: 100.0 },
      };

      const nonMatchingPool = [
        21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
        41, 42, 43, 44, 45, 46, 47, 48, 49, 50,
      ];
      const betAmount = 100;

      for (let spots = 1; spots <= 10; spots++) {
        const selected = Array.from({ length: spots }, (_, i) => i + 1);
        const expectedHits = expectedFullTable[spots];

        // Also test 0 hits
        {
          const forced0 = nonMatchingPool.slice(0, 20);
          const res0 = evaluateKenoRound(`test_${spots}_0`, betAmount, selected, DEFAULT_KENO_CONFIG, forced0);
          expect(res0.matchCount).toBe(0);
          expect(res0.multiplier).toBe(0);
          expect(res0.payout).toBe(0);
          expect(res0.profit).toBe(-betAmount);
          expect(res0.isWin).toBe(false);
        }

        // Test every hit count 1..spots
        for (let hits = 1; hits <= spots; hits++) {
          const matchingPart = selected.slice(0, hits);
          const nonMatchingPart = nonMatchingPool.slice(0, 20 - hits);
          const forcedDraw = [...matchingPart, ...nonMatchingPart];

          const res = evaluateKenoRound(
            `test_${spots}_${hits}`,
            betAmount,
            selected,
            DEFAULT_KENO_CONFIG,
            forcedDraw
          );

          const expectedMult = expectedHits[hits];
          const expectedPayout = Math.round(betAmount * expectedMult * 100) / 100;
          const expectedProfit = Math.round((expectedPayout - betAmount) * 100) / 100;

          expect(res.matchCount).toBe(hits);
          expect(res.multiplier).toBe(expectedMult);
          expect(res.payout).toBe(expectedPayout);
          expect(res.profit).toBe(expectedProfit);
          expect(res.isWin).toBe(expectedPayout > betAmount);
        }
      }
    });

    test('evaluates loss correctly when hits yield 0x multiplier', () => {
      const selected = [1, 2, 3, 4, 5];
      // 1 match on 5 spots yields 0x
      const forced = [1, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39];

      const res = evaluateKenoRound('rnd_keno_5', 50, selected, DEFAULT_KENO_CONFIG, forced);
      expect(res.matchCount).toBe(1);
      expect(res.multiplier).toBe(0);
      expect(res.payout).toBe(0);
      expect(res.profit).toBe(-50);
      expect(res.isWin).toBe(false);
    });
  });

  describe('validateKenoBet', () => {
    test('accepts valid bets with 1 to 10 unique spots', () => {
      expect(validateKenoBet(50, [5, 12, 34, 78]).isValid).toBe(true);
      expect(validateKenoBet(10, [1]).isValid).toBe(true);
      expect(validateKenoBet(5000, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).isValid).toBe(true);
    });

    test('rejects spot counts outside 1 to 10', () => {
      expect(validateKenoBet(50, []).isValid).toBe(false);
      expect(validateKenoBet(50, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]).isValid).toBe(false);
    });

    test('rejects duplicate or out-of-bounds numbers', () => {
      expect(validateKenoBet(50, [5, 5, 12]).isValid).toBe(false);
      expect(validateKenoBet(50, [0, 12, 15]).isValid).toBe(false);
      expect(validateKenoBet(50, [12, 81]).isValid).toBe(false);
    });

    test('rejects bets outside min/max bet boundaries', () => {
      expect(validateKenoBet(5, [1, 2]).isValid).toBe(false);
      expect(validateKenoBet(10000, [1, 2]).isValid).toBe(false);
    });
  });
});

