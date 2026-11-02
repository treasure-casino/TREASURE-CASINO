import {
  generateRevealedNumber,
  generateStoppingMultiplier,
  evaluateHotlineRound,
  validateHotlineBet,
  validateHotlineCashout,
  DEFAULT_HOTLINE_CONFIG,
} from '../hotlineEngine';

describe('Hotline Engine Unit Tests', () => {
  describe('generateRevealedNumber', () => {
    test('generates numbers within 1 to 100', () => {
      for (let i = 0; i < 50; i++) {
        const num = generateRevealedNumber(1, 100);
        expect(num).toBeGreaterThanOrEqual(1);
        expect(num).toBeLessThanOrEqual(100);
        expect(Number.isInteger(num)).toBe(true);
      }
    });

    test('respects forcedNumber parameter', () => {
      expect(generateRevealedNumber(1, 100, 42)).toBe(42);
      expect(generateRevealedNumber(1, 100, 1)).toBe(1);
      expect(generateRevealedNumber(1, 100, 100)).toBe(100);
    });
  });

  describe('generateStoppingMultiplier', () => {
    test('generates multipliers >= 1.00x and <= maxMultiplier', () => {
      for (let i = 0; i < 50; i++) {
        const mult = generateStoppingMultiplier(0.96, 1000.0);
        expect(mult).toBeGreaterThanOrEqual(1.0);
        expect(mult).toBeLessThanOrEqual(1000.0);
      }
    });

    test('respects forcedMultiplier', () => {
      expect(generateStoppingMultiplier(0.96, 1000.0, 5.55)).toBe(5.55);
      expect(generateStoppingMultiplier(0.96, 1000.0, 1.0)).toBe(1.0);
    });
  });

  describe('evaluateHotlineRound', () => {
    test('detects Direct Hit when selected number matches revealed number', () => {
      const res = evaluateHotlineRound(50, DEFAULT_HOTLINE_CONFIG, 50, 4.0);
      expect(res.revealedNumber).toBe(50);
      expect(res.isDirectHit).toBe(true);
      expect(res.isHotZone).toBe(false);
      expect(res.bonusMultiplier).toBe(2.0);
      expect(res.stoppingMultiplier).toBe(8.0); // 4.0 * 2.0 = 8.0
    });

    test('detects Hot Zone when selected number is within 3 of revealed number', () => {
      const res = evaluateHotlineRound(52, DEFAULT_HOTLINE_CONFIG, 50, 4.0);
      expect(res.revealedNumber).toBe(50);
      expect(res.isDirectHit).toBe(false);
      expect(res.isHotZone).toBe(true);
      expect(res.bonusMultiplier).toBe(1.25);
      expect(res.stoppingMultiplier).toBe(5.0); // 4.0 * 1.25 = 5.0
    });

    test('handles standard non-bonus distance (> 3)', () => {
      const res = evaluateHotlineRound(60, DEFAULT_HOTLINE_CONFIG, 50, 4.0);
      expect(res.isDirectHit).toBe(false);
      expect(res.isHotZone).toBe(false);
      expect(res.bonusMultiplier).toBe(1.0);
      expect(res.stoppingMultiplier).toBe(4.0);
    });
  });

  describe('validateHotlineBet', () => {
    test('accepts valid bets between min and max bet with number in [1..100]', () => {
      expect(validateHotlineBet(50, 25).isValid).toBe(true);
      expect(validateHotlineBet(10, 1).isValid).toBe(true);
      expect(validateHotlineBet(5000, 100).isValid).toBe(true);
    });

    test('rejects numbers outside 1 to 100', () => {
      expect(validateHotlineBet(50, 0).isValid).toBe(false);
      expect(validateHotlineBet(50, 101).isValid).toBe(false);
      expect(validateHotlineBet(50, 25.5).isValid).toBe(false);
    });

    test('rejects bets outside min/max bet boundaries', () => {
      expect(validateHotlineBet(5, 50).isValid).toBe(false);
      expect(validateHotlineBet(10000, 50).isValid).toBe(false);
    });
  });

  describe('validateHotlineCashout', () => {
    test('allows cashout before or at stopping multiplier', () => {
      const valid = validateHotlineCashout(2.5, 5.0, 100);
      expect(valid.isValid).toBe(true);
      expect(valid.settledMultiplier).toBe(2.5);
      expect(valid.payout).toBe(250);
      expect(valid.profit).toBe(150);
    });

    test('rejects cashout exceeding stopping multiplier (burnout/crash)', () => {
      const bust = validateHotlineCashout(5.2, 5.0, 100);
      expect(bust.isValid).toBe(false);
      expect(bust.payout).toBe(0);
      expect(bust.profit).toBe(-100);
    });
  });
});

