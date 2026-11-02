import {
  DEFAULT_PLINKO_CONFIG,
  DEFAULT_PLINKO_MULTIPLIER_TABLES,
  calculateTheoreticalRtp,
  generatePlinkoPath,
  evaluatePlinkoRound,
  validatePlinkoBet,
  PlinkoRows,
  PlinkoRisk,
} from '../plinkoEngine';

describe('Plinko Engine Unit Tests', () => {
  describe('Multiplier Tables Structure & Symmetry', () => {
    const rowsList: PlinkoRows[] = [8, 12, 16];
    const riskList: PlinkoRisk[] = ['LOW', 'MEDIUM', 'HIGH'];

    rowsList.forEach((rows) => {
      riskList.forEach((risk) => {
        test(`Rows ${rows} Risk ${risk}: has exactly ${rows + 1} slots and is symmetric`, () => {
          const table = DEFAULT_PLINKO_MULTIPLIER_TABLES[rows][risk];
          expect(table).toHaveLength(rows + 1);

          // Check symmetry
          for (let i = 0; i < Math.floor(table.length / 2); i++) {
            const left = table[i];
            const right = table[table.length - 1 - i];
            expect(left).toBe(right);
          }
        });

        test(`Rows ${rows} Risk ${risk}: has theoretical RTP between 95% and 99.5%`, () => {
          const rtp = calculateTheoreticalRtp(rows, risk, DEFAULT_PLINKO_CONFIG);
          expect(rtp).toBeGreaterThanOrEqual(0.95);
          expect(rtp).toBeLessThanOrEqual(0.995);
        });
      });
    });

    test('High risk configurations have significantly higher wing multipliers than low risk', () => {
      expect(DEFAULT_PLINKO_MULTIPLIER_TABLES[8].HIGH[0]).toBeGreaterThan(
        DEFAULT_PLINKO_MULTIPLIER_TABLES[8].LOW[0]
      );
      expect(DEFAULT_PLINKO_MULTIPLIER_TABLES[12].HIGH[0]).toBeGreaterThan(
        DEFAULT_PLINKO_MULTIPLIER_TABLES[12].LOW[0]
      );
      expect(DEFAULT_PLINKO_MULTIPLIER_TABLES[16].HIGH[0]).toBe(1000.0);
    });
  });

  describe('Path Generation & Slot Calculation', () => {
    test('generatePlinkoPath produces binary path of exact row length', () => {
      const { path, slotIndex, multiplier } = generatePlinkoPath(8, 'MEDIUM');
      expect(path).toHaveLength(8);
      path.forEach((step) => {
        expect([0, 1]).toContain(step);
      });
      const sum = path.reduce((a, b) => a + b, 0);
      expect(slotIndex).toBe(sum);
      expect(multiplier).toBe(DEFAULT_PLINKO_MULTIPLIER_TABLES[8].MEDIUM[slotIndex]);
    });

    test('generatePlinkoPath respects forcedSlot parameter for deterministic verification', () => {
      const forced = generatePlinkoPath(16, 'HIGH', DEFAULT_PLINKO_CONFIG, 0);
      expect(forced.slotIndex).toBe(0);
      expect(forced.multiplier).toBe(1000.0);
      expect(forced.path.reduce((a, b) => a + b, 0)).toBe(0);

      const forcedRightWing = generatePlinkoPath(16, 'HIGH', DEFAULT_PLINKO_CONFIG, 16);
      expect(forcedRightWing.slotIndex).toBe(16);
      expect(forcedRightWing.multiplier).toBe(1000.0);
      expect(forcedRightWing.path.reduce((a, b) => a + b, 0)).toBe(16);
    });
  });

  describe('evaluatePlinkoRound Payouts', () => {
    test('evaluates winning payout and profit correctly', () => {
      const res = evaluatePlinkoRound('rnd_1', 100, 8, 'LOW', DEFAULT_PLINKO_CONFIG, 0);
      expect(res.roundId).toBe('rnd_1');
      expect(res.betAmount).toBe(100);
      expect(res.slotIndex).toBe(0);
      expect(res.multiplier).toBe(5.6);
      expect(res.payout).toBe(560);
      expect(res.profit).toBe(460);
      expect(res.isWin).toBe(true);
    });

    test('evaluates loss/partial return correctly', () => {
      const res = evaluatePlinkoRound('rnd_2', 100, 8, 'LOW', DEFAULT_PLINKO_CONFIG, 4);
      expect(res.slotIndex).toBe(4);
      expect(res.multiplier).toBe(0.5);
      expect(res.payout).toBe(50);
      expect(res.profit).toBe(-50);
      expect(res.isWin).toBe(false);
    });
  });

  describe('validatePlinkoBet Input Validation', () => {
    test('validates valid bet and options', () => {
      const valid = validatePlinkoBet(50, 12, 'MEDIUM');
      expect(valid.isValid).toBe(true);
    });

    test('rejects bet below minimum or above maximum', () => {
      const tooLow = validatePlinkoBet(5, 8, 'LOW');
      expect(tooLow.isValid).toBe(false);

      const tooHigh = validatePlinkoBet(10000, 8, 'LOW');
      expect(tooHigh.isValid).toBe(false);
    });

    test('rejects invalid rows or risk levels', () => {
      const badRows = validatePlinkoBet(100, 10, 'LOW');
      expect(badRows.isValid).toBe(false);

      const badRisk = validatePlinkoBet(100, 8, 'EXTREME');
      expect(badRisk.isValid).toBe(false);
    });
  });
});

