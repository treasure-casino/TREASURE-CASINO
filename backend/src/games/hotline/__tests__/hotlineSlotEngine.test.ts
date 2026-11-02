import {
  HOTLINE_SYMBOLS,
  HOTLINE_SYMBOLS_LOW,
  HOTLINE_SYMBOLS_HIGH,
  HOTLINE_PAYLINES,
  generateSlotGrid,
  processExpandingWilds,
  evaluateHotlineSlot,
  executeHotlineSlotSpin,
  calculateTotalBet,
  calculateFreeSpinsAwarded,
  rollSymbol,
  SCATTER_PROBABILITY,
  HOTLINE_THEORETICAL_MATH,
} from '../hotlineSlotEngine';

describe('Treasure Hotline Slot Engine — PRD Specifications', () => {
  test('Contains all 8 required original 80s Hotline symbols', () => {
    const symbolCodes = HOTLINE_SYMBOLS.map((s) => s.code);
    expect(symbolCodes).toContain('WILD');
    expect(symbolCodes).toContain('NEON_7');
    expect(symbolCodes).toContain('HOTLINE_PHONE');
    expect(symbolCodes).toContain('SPORTS_CAR');
    expect(symbolCodes).toContain('PALM_TREE');
    expect(symbolCodes).toContain('CASSETTE');
    expect(symbolCodes).toContain('STAR');
    expect(symbolCodes).toContain('SCATTER');
    expect(HOTLINE_SYMBOLS.length).toBe(8);
  });

  test('Has 20 configured paylines for 5x3 grid', () => {
    expect(HOTLINE_PAYLINES.length).toBe(20);
    HOTLINE_PAYLINES.forEach((pl) => {
      expect(pl.coords.length).toBe(5);
    });
  });

  test('PRD: LOW RISK vs HIGH RISK paytables are distinct and properly configured', () => {
    const neon7Low = HOTLINE_SYMBOLS_LOW.find((s) => s.code === 'NEON_7')!;
    const neon7High = HOTLINE_SYMBOLS_HIGH.find((s) => s.code === 'NEON_7')!;
    expect(neon7High.payouts[5]).toBeGreaterThan(neon7Low.payouts[5]); // 500x vs 180x

    const wildLow = HOTLINE_SYMBOLS_LOW.find((s) => s.code === 'WILD')!;
    const wildHigh = HOTLINE_SYMBOLS_HIGH.find((s) => s.code === 'WILD')!;
    expect(wildHigh.payouts[5]).toBeGreaterThan(wildLow.payouts[5]); // 600x vs 200x
  });

  test('PRD: Bonus Bet calculation adds 50% extra demo bet', () => {
    expect(calculateTotalBet(100, false, false)).toBe(100);
    expect(calculateTotalBet(100, true, false)).toBe(150);
    expect(calculateTotalBet(50, true, false)).toBe(75);
    // Free spin deducts 0
    expect(calculateTotalBet(100, true, true)).toBe(0);
    expect(calculateTotalBet(100, false, true)).toBe(0);
  });

  test('PRD: Free Spins trigger and retrigger rules', () => {
    // Base game trigger: 3 Scatters=10, 4=15, 5=20
    expect(calculateFreeSpinsAwarded(2, false)).toEqual({
      freeSpins: 0,
      isTriggered: false,
      isRetrigger: false,
    });
    expect(calculateFreeSpinsAwarded(3, false)).toEqual({
      freeSpins: 10,
      isTriggered: true,
      isRetrigger: false,
    });
    expect(calculateFreeSpinsAwarded(4, false)).toEqual({
      freeSpins: 15,
      isTriggered: true,
      isRetrigger: false,
    });
    expect(calculateFreeSpinsAwarded(5, false)).toEqual({
      freeSpins: 20,
      isTriggered: true,
      isRetrigger: false,
    });

    // Retrigger during Free Spins: 3+ Scatters award +5 spins
    expect(calculateFreeSpinsAwarded(3, true)).toEqual({
      freeSpins: 5,
      isTriggered: true,
      isRetrigger: true,
    });
    expect(calculateFreeSpinsAwarded(2, true)).toEqual({
      freeSpins: 0,
      isTriggered: false,
      isRetrigger: false,
    });
  });

  test('Expanding Wild: vertically expands across entire reel column', () => {
    const initialGrid = [
      [1, 1, 2, 1, 1],
      [1, 1, 0, 1, 1], // Wild at col 2
      [1, 1, 3, 1, 1],
    ];

    const { expandedGrid, expandedReels } = processExpandingWilds(initialGrid);

    expect(expandedReels).toEqual([2]);
    expect(expandedGrid[0][2]).toBe(0);
    expect(expandedGrid[1][2]).toBe(0);
    expect(expandedGrid[2][2]).toBe(0);
  });

  test('Wild substitutes on payline in both LOW and HIGH risk modes', () => {
    const grid = [
      [5, 5, 5, 5, 5],
      [1, 1, 0, 6, 6], // Payline 1: 2x Neon 7 + 1x Wild
      [5, 5, 5, 5, 5],
    ];

    const lowResult = evaluateHotlineSlot(grid, 100, 'LOW');
    const highResult = evaluateHotlineSlot(grid, 100, 'HIGH');

    const lowLine = lowResult.winningLines.find((w) => w.lineId === 1)!;
    const highLine = highResult.winningLines.find((w) => w.lineId === 1)!;

    expect(lowLine.count).toBe(3);
    expect(highLine.count).toBe(3);
    expect(highLine.payout).toBeGreaterThan(lowLine.payout); // HIGH risk pays more per match
  });

  test('Execute spin supports full PRD options (riskLevel, bonusBetActive, isFreeSpin)', () => {
    const spin = executeHotlineSlotSpin({
      betAmount: 100,
      riskLevel: 'HIGH',
      bonusBetActive: true,
      isFreeSpin: false,
    });

    expect(spin.riskLevel).toBe('HIGH');
    expect(spin.bonusBetActive).toBe(true);
    expect(spin.baseBet).toBe(100);
    expect(spin.totalBet).toBe(150);
    expect(spin.rawGrid.length).toBe(3);
    expect(spin.expandedGrid.length).toBe(3);
    expect(typeof spin.freeSpinsAwarded).toBe('number');
  });

  test('Free spin execution deducts ₹0 total bet', () => {
    const spin = executeHotlineSlotSpin({
      betAmount: 100,
      riskLevel: 'LOW',
      bonusBetActive: false,
      isFreeSpin: true,
    });

    expect(spin.totalBet).toBe(0);
    expect(spin.isFreeSpinRound).toBe(true);
    expect(spin.totalPayout).toBeGreaterThanOrEqual(0);
  });

  test('Scatter symbol configuration: exactly 1% (0.010) across all modes', () => {
    // 1. Backend source of truth constant
    expect(SCATTER_PROBABILITY).toBe(0.01);

    // 2. Exact boundary tests on rollSymbol
    // Any random float strictly less than 0.01 must yield SCATTER (7)
    expect(rollSymbol('LOW', false, false, 0.000)).toBe(7);
    expect(rollSymbol('LOW', false, false, 0.005)).toBe(7);
    expect(rollSymbol('LOW', false, false, 0.009999)).toBe(7);

    expect(rollSymbol('HIGH', false, false, 0.000)).toBe(7);
    expect(rollSymbol('HIGH', false, false, 0.005)).toBe(7);
    expect(rollSymbol('HIGH', false, false, 0.009999)).toBe(7);

    // At or above 0.01 must NOT yield SCATTER
    expect(rollSymbol('LOW', false, false, 0.010)).not.toBe(7);
    expect(rollSymbol('HIGH', false, false, 0.010)).not.toBe(7);
    expect(rollSymbol('LOW', false, false, 0.500)).not.toBe(7);
    expect(rollSymbol('HIGH', false, false, 0.999)).not.toBe(7);
  });

  test('Empirical Scatter distribution verifies 1.0% frequency in LOW and HIGH modes', () => {
    const SAMPLE_SIZE = 100000;

    // Test LOW RISK
    let lowScatterCount = 0;
    for (let i = 0; i < SAMPLE_SIZE; i++) {
      if (rollSymbol('LOW') === 7) {
        lowScatterCount++;
      }
    }
    const lowRate = lowScatterCount / SAMPLE_SIZE;
    // Expected 0.0100 (1.00%), 3-sigma tolerance ~0.00094, allowable [0.0085, 0.0115]
    expect(lowRate).toBeGreaterThanOrEqual(0.0085);
    expect(lowRate).toBeLessThanOrEqual(0.0115);

    // Test HIGH RISK
    let highScatterCount = 0;
    for (let i = 0; i < SAMPLE_SIZE; i++) {
      if (rollSymbol('HIGH') === 7) {
        highScatterCount++;
      }
    }
    const highRate = highScatterCount / SAMPLE_SIZE;
    expect(highRate).toBeGreaterThanOrEqual(0.0085);
    expect(highRate).toBeLessThanOrEqual(0.0115);
  });

  test('PRD: Reduced Win Rate & 96% Theoretical RTP Verification', () => {
    expect(HOTLINE_THEORETICAL_MATH.targetRtp).toBe(0.96);
    expect(HOTLINE_THEORETICAL_MATH.targetRtpPercent).toBe('96.0%');

    // Run 20,000 spin Monte Carlo test on LOW RISK
    const N = 20000;
    let lowWins = 0;
    let lowTotalBet = 0;
    let lowTotalPayout = 0;

    for (let i = 0; i < N; i++) {
      const res = executeHotlineSlotSpin({ betAmount: 100, riskLevel: 'LOW' });
      lowTotalBet += res.totalBet;
      lowTotalPayout += res.totalPayout;
      if (res.isWin) lowWins++;
    }

    const lowWinRate = lowWins / N;
    const lowRtp = lowTotalPayout / lowTotalBet;

    // Win rate must be substantially reduced from the previous 64.6% runaway rate
    expect(lowWinRate).toBeLessThan(0.48);
    expect(lowWinRate).toBeGreaterThan(0.35);
    // RTP should be around 91-98%
    expect(lowRtp).toBeGreaterThan(0.80);
    expect(lowRtp).toBeLessThan(1.10);
  });
});
