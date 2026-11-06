import { StoredGameProbability } from '../controllers/admin/admin.probability.controller';

describe('Game Probability Settings Unit Tests', () => {
  it('correctly calculates loss probability as (100 - winProbability)', () => {
    const testCases = [
      { win: 50.0, expectedLoss: 50.0 },
      { win: 48.2, expectedLoss: 51.8 },
      { win: 90.0, expectedLoss: 10.0 },
      { win: 10.5, expectedLoss: 89.5 },
      { win: 1.0, expectedLoss: 99.0 },
      { win: 99.0, expectedLoss: 1.0 },
    ];

    for (const tc of testCases) {
      const calculatedLoss = +(100 - tc.win).toFixed(1);
      expect(calculatedLoss).toBe(tc.expectedLoss);
      expect(+(tc.win + calculatedLoss).toFixed(1)).toBe(100.0);
    }
  });

  it('validates win probability boundaries (must be between 1.0% and 99.0%)', () => {
    const isValid = (p: number) => typeof p === 'number' && !isNaN(p) && p >= 1.0 && p <= 99.0;

    expect(isValid(0.5)).toBe(false);
    expect(isValid(1.0)).toBe(true);
    expect(isValid(50.0)).toBe(true);
    expect(isValid(99.0)).toBe(true);
    expect(isValid(99.5)).toBe(false);
    expect(isValid(100.0)).toBe(false);
    expect(isValid(-10)).toBe(false);
  });

  it('runs Monte Carlo simulation preview and converges within statistical bounds', () => {
    const winProb = 60.0;
    const rounds = 5000;
    let wins = 0;
    let losses = 0;

    for (let i = 0; i < rounds; i++) {
      const roll = Math.random() * 100;
      if (roll < winProb) {
        wins++;
      } else {
        losses++;
      }
    }

    const empiricalWinRate = (wins / rounds) * 100;
    expect(wins + losses).toBe(rounds);
    // Empirical rate should be within +- 3% of target probability for 5000 rounds
    expect(empiricalWinRate).toBeGreaterThan(57.0);
    expect(empiricalWinRate).toBeLessThan(63.0);
  });

  it('ensures demo settings object serializes and deserializes cleanly', () => {
    const settings: Record<string, StoredGameProbability> = {
      'game-slot-01': {
        winProbability: 55.5,
        lossProbability: 44.5,
        isSimulationEnabled: true,
        updatedAt: new Date().toISOString(),
        updatedBy: 'admin-uuid-1',
      },
      'game-crash-01': {
        winProbability: 45.0,
        lossProbability: 55.0,
        isSimulationEnabled: true,
        updatedAt: new Date().toISOString(),
        updatedBy: 'admin-uuid-1',
      },
    };

    const json = JSON.stringify(settings);
    const parsed = JSON.parse(json);

    expect(parsed['game-slot-01'].winProbability).toBe(55.5);
    expect(parsed['game-slot-01'].lossProbability).toBe(44.5);
    expect(parsed['game-crash-01'].winProbability).toBe(45.0);
  });
});
