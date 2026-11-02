import {
  CHICKEN_DIFFICULTIES,
  DEFAULT_CHICKEN_CONFIG,
  TOTAL_TILES,
  BASE_RTP,
  initializeRound,
  evaluateStep,
  cashOutRound,
  validateChickenBet,
  generateMultiplierLadder,
  secureRandomFloat,
  ChickenDifficulty,
} from '../chickenRunEngine';

describe('TREASURE CHICKEN RUN — Core Math Engine Tests', () => {
  describe('Configuration & Multiplier Ladders', () => {
    it('has all 4 required difficulties', () => {
      const difficulties: ChickenDifficulty[] = ['EASY', 'MEDIUM', 'HARD', 'HARDCORE'];
      difficulties.forEach((diff) => {
        const config = CHICKEN_DIFFICULTIES[diff];
        expect(config).toBeDefined();
        expect(config.totalTiles).toBe(TOTAL_TILES);
        expect(config.multipliers.length).toBe(TOTAL_TILES);
        expect(config.survivalProbability).toBeGreaterThan(0.5);
        expect(config.survivalProbability).toBeLessThan(1.0);
      });
    });

    it('multipliers grow strictly monotonically for all difficulties', () => {
      const difficulties: ChickenDifficulty[] = ['EASY', 'MEDIUM', 'HARD', 'HARDCORE'];
      difficulties.forEach((diff) => {
        const multipliers = CHICKEN_DIFFICULTIES[diff].multipliers;
        for (let i = 1; i < multipliers.length; i++) {
          expect(multipliers[i]).toBeGreaterThan(multipliers[i - 1]);
        }
      });
    });

    it('HARDCORE has higher multipliers than HARD, MEDIUM, and EASY at step 10', () => {
      const easyM10 = CHICKEN_DIFFICULTIES.EASY.multipliers[9];
      const medM10 = CHICKEN_DIFFICULTIES.MEDIUM.multipliers[9];
      const hardM10 = CHICKEN_DIFFICULTIES.HARD.multipliers[9];
      const hcM10 = CHICKEN_DIFFICULTIES.HARDCORE.multipliers[9];

      expect(hcM10).toBeGreaterThan(hardM10);
      expect(hardM10).toBeGreaterThan(medM10);
      expect(medM10).toBeGreaterThan(easyM10);
    });

    it('verifies 96% theoretical RTP at intermediate steps', () => {
      // Theoretical RTP = (survivalProbability ^ k) * multiplier(k)
      const diff = CHICKEN_DIFFICULTIES.MEDIUM;
      for (const step of [1, 5, 10, 15]) {
        const prob = Math.pow(diff.survivalProbability, step);
        const mult = diff.multipliers[step - 1];
        const rtp = prob * mult;
        // RTP should be within ~1% of 0.96 due to rounding of multipliers
        expect(rtp).toBeGreaterThanOrEqual(0.94);
        expect(rtp).toBeLessThanOrEqual(0.98);
      }
    });
  });

  describe('Bet Validation', () => {
    it('accepts valid bets between min and max', () => {
      expect(validateChickenBet(10).isValid).toBe(true);
      expect(validateChickenBet(50).isValid).toBe(true);
      expect(validateChickenBet(1000).isValid).toBe(true);
      expect(validateChickenBet(5000).isValid).toBe(true);
    });

    it('rejects bets below minBet', () => {
      const res = validateChickenBet(5);
      expect(res.isValid).toBe(false);
      expect(res.message).toContain('Minimum bet');
    });

    it('rejects bets above maxBet', () => {
      const res = validateChickenBet(6000);
      expect(res.isValid).toBe(false);
      expect(res.message).toContain('Maximum bet');
    });

    it('rejects invalid or NaN values', () => {
      expect(validateChickenBet(NaN).isValid).toBe(false);
      expect(validateChickenBet('50' as any).isValid).toBe(false);
    });
  });

  describe('Round Lifecycle: Initialize, Step, and Cashout', () => {
    it('initializes a fresh active round', () => {
      const round = initializeRound('round_test_01', 'user_123', 100, 'EASY');
      expect(round.roundId).toBe('round_test_01');
      expect(round.userId).toBe('user_123');
      expect(round.betAmount).toBe(100);
      expect(round.difficulty).toBe('EASY');
      expect(round.currentStep).toBe(0);
      expect(round.currentMultiplier).toBe(1.0);
      expect(round.status).toBe('ACTIVE');
      expect(round.tiles.length).toBe(24);
      expect(round.seed).toBeDefined();
      expect(round.hash).toBeDefined();
    });

    it('evaluates SAFE step correctly and advances step and multiplier', () => {
      const round = initializeRound('round_test_02', 'user_123', 50, 'MEDIUM');
      const step1 = evaluateStep(round, 'SAFE');

      expect(step1.outcome).toBe('SAFE');
      expect(round.currentStep).toBe(1);
      expect(round.currentMultiplier).toBe(CHICKEN_DIFFICULTIES.MEDIUM.multipliers[0]);
      expect(round.accumulatedPayout).toBe(
        Math.round(50 * CHICKEN_DIFFICULTIES.MEDIUM.multipliers[0] * 100) / 100
      );
      expect(round.status).toBe('ACTIVE');
    });

    it('evaluates BUST step correctly and marks round BUSTED with 0 payout', () => {
      const round = initializeRound('round_test_03', 'user_123', 50, 'MEDIUM');
      evaluateStep(round, 'SAFE'); // Step 1 safe
      const step2 = evaluateStep(round, 'BUST'); // Step 2 bust

      expect(step2.outcome).toBe('BUST');
      expect(round.status).toBe('BUSTED');
      expect(round.accumulatedPayout).toBe(0);
      expect(step2.payout).toBe(0);
    });

    it('prevents stepping after bust', () => {
      const round = initializeRound('round_test_04', 'user_123', 50, 'MEDIUM');
      evaluateStep(round, 'BUST');
      expect(() => evaluateStep(round, 'SAFE')).toThrow('not ACTIVE');
    });

    it('cannot cash out before taking at least 1 step', () => {
      const round = initializeRound('round_test_05', 'user_123', 50, 'MEDIUM');
      expect(() => cashOutRound(round)).toThrow('before taking at least 1 step');
    });

    it('cashes out successfully after safe steps and prevents duplicate cashout', () => {
      const round = initializeRound('round_test_06', 'user_123', 100, 'HARD');
      evaluateStep(round, 'SAFE'); // Step 1
      evaluateStep(round, 'SAFE'); // Step 2

      const multAtStep2 = round.currentMultiplier;
      const result = cashOutRound(round);

      expect(round.status).toBe('CASHED_OUT');
      expect(result.multiplier).toBe(multAtStep2);
      expect(result.payout).toBe(Math.round(100 * multAtStep2 * 100) / 100);

      // Attempt second cashout should fail
      expect(() => cashOutRound(round)).toThrow('not ACTIVE');
    });

    it('auto-cashes out when maximum step (24) is reached', () => {
      const round = initializeRound('round_test_07', 'user_123', 10, 'EASY');
      for (let i = 0; i < 24; i++) {
        evaluateStep(round, 'SAFE');
      }
      expect(round.currentStep).toBe(24);
      expect(round.status).toBe('CASHED_OUT');
      expect(round.accumulatedPayout).toBeGreaterThan(0);
    });
  });

  describe('Empirical Randomness & Probability Distribution', () => {
    it('verifies empirical survival probability matches theoretical rate over 5,000 steps', () => {
      const difficulty: ChickenDifficulty = 'MEDIUM';
      const targetSurvival = CHICKEN_DIFFICULTIES.MEDIUM.survivalProbability; // 0.84
      let safeCount = 0;
      const iterations = 5000;

      for (let i = 0; i < iterations; i++) {
        const round = initializeRound(`sim_${i}`, 'sim_user', 10, difficulty);
        const { outcome } = evaluateStep(round);
        if (outcome === 'SAFE') {
          safeCount++;
        }
      }

      const empiricalRate = safeCount / iterations;
      // Within 2% error margin of 0.84
      expect(empiricalRate).toBeGreaterThanOrEqual(targetSurvival - 0.025);
      expect(empiricalRate).toBeLessThanOrEqual(targetSurvival + 0.025);
    });
  });
});

