import crypto from 'crypto';

export type RiskLevel = 'LOW' | 'HIGH';

export interface SlotSymbolDef {
  id: number;
  code: string;
  name: string;
  isWild?: boolean;
  isScatter?: boolean;
  payouts: Record<number, number>; // count (3, 4, 5) -> line bet multiplier (or total bet for scatter)
}

// ─── LOW RISK PAYTABLE (Balanced Volatility, Frequent Hits) ──────────────────
export const HOTLINE_SYMBOLS_LOW: SlotSymbolDef[] = [
  {
    id: 0,
    code: 'WILD',
    name: 'Wild (Expanding)',
    isWild: true,
    payouts: { 5: 480, 4: 170, 3: 32 },
  },
  {
    id: 1,
    code: 'NEON_7',
    name: 'Neon 7',
    payouts: { 5: 400, 4: 140, 3: 28 },
  },
  {
    id: 2,
    code: 'HOTLINE_PHONE',
    name: 'Hotline Phone',
    payouts: { 5: 280, 4: 95, 3: 19 },
  },
  {
    id: 3,
    code: 'SPORTS_CAR',
    name: 'Sports Car',
    payouts: { 5: 180, 4: 65, 3: 14 },
  },
  {
    id: 4,
    code: 'PALM_TREE',
    name: 'Palm Tree',
    payouts: { 5: 120, 4: 42, 3: 9 },
  },
  {
    id: 5,
    code: 'CASSETTE',
    name: 'Cassette',
    payouts: { 5: 75, 4: 26, 3: 6 },
  },
  {
    id: 6,
    code: 'STAR',
    name: 'Star',
    payouts: { 5: 45, 4: 15, 3: 3.5 },
  },
  {
    id: 7,
    code: 'SCATTER',
    name: 'Scatter',
    isScatter: true,
    // Scatter pays on TOTAL bet: 2=1x, 3=5x, 4=20x, 5=75x
    payouts: { 5: 75, 4: 20, 3: 5, 2: 1 },
  },
];

// ─── HIGH RISK PAYTABLE (High Volatility, Massive Multipliers) ────────────────
export const HOTLINE_SYMBOLS_HIGH: SlotSymbolDef[] = [
  {
    id: 0,
    code: 'WILD',
    name: 'Wild (Expanding)',
    isWild: true,
    payouts: { 5: 1050, 4: 370, 3: 55 },
  },
  {
    id: 1,
    code: 'NEON_7',
    name: 'Neon 7',
    payouts: { 5: 850, 4: 270, 3: 40 },
  },
  {
    id: 2,
    code: 'HOTLINE_PHONE',
    name: 'Hotline Phone',
    payouts: { 5: 550, 4: 170, 3: 27 },
  },
  {
    id: 3,
    code: 'SPORTS_CAR',
    name: 'Sports Car',
    payouts: { 5: 320, 4: 105, 3: 17 },
  },
  {
    id: 4,
    code: 'PALM_TREE',
    name: 'Palm Tree',
    payouts: { 5: 180, 4: 62, 3: 11 },
  },
  {
    id: 5,
    code: 'CASSETTE',
    name: 'Cassette',
    payouts: { 5: 100, 4: 35, 3: 6 },
  },
  {
    id: 6,
    code: 'STAR',
    name: 'Star',
    payouts: { 5: 50, 4: 17, 3: 2.5 },
  },
  {
    id: 7,
    code: 'SCATTER',
    name: 'Scatter',
    isScatter: true,
    // Scatter pays on TOTAL bet: 2=2x, 3=15x, 4=60x, 5=250x
    payouts: { 5: 250, 4: 60, 3: 15, 2: 2 },
  },
];

// Default export for backward compatibility
export const HOTLINE_SYMBOLS = HOTLINE_SYMBOLS_LOW;

export interface PaylineDef {
  id: number;
  name: string;
  coords: [number, number][]; // [row, col] for 5 reels (col 0..4)
}

// 20 Classic 5x3 Video Slot Paylines
export const HOTLINE_PAYLINES: PaylineDef[] = [
  { id: 1, name: 'Middle Line', coords: [[1, 0], [1, 1], [1, 2], [1, 3], [1, 4]] },
  { id: 2, name: 'Top Line', coords: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] },
  { id: 3, name: 'Bottom Line', coords: [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4]] },
  { id: 4, name: 'V-Shape', coords: [[0, 0], [1, 1], [2, 2], [1, 3], [0, 4]] },
  { id: 5, name: 'Inverted V', coords: [[2, 0], [1, 1], [0, 2], [1, 3], [2, 4]] },
  { id: 6, name: 'Step Down', coords: [[0, 0], [0, 1], [1, 2], [2, 3], [2, 4]] },
  { id: 7, name: 'Step Up', coords: [[2, 0], [2, 1], [1, 2], [0, 3], [0, 4]] },
  { id: 8, name: 'Bottom Trough', coords: [[1, 0], [2, 1], [2, 2], [2, 3], [1, 4]] },
  { id: 9, name: 'Top Crest', coords: [[1, 0], [0, 1], [0, 2], [0, 3], [1, 4]] },
  { id: 10, name: 'Top Zigzag', coords: [[0, 0], [1, 1], [0, 2], [1, 3], [0, 4]] },
  { id: 11, name: 'Bottom Zigzag', coords: [[2, 0], [1, 1], [2, 2], [1, 3], [2, 4]] },
  { id: 12, name: 'Upper Wave', coords: [[1, 0], [0, 1], [1, 2], [0, 3], [1, 4]] },
  { id: 13, name: 'Lower Wave', coords: [[1, 0], [2, 1], [1, 2], [2, 3], [1, 4]] },
  { id: 14, name: 'Top Dip', coords: [[0, 0], [1, 1], [1, 2], [1, 3], [0, 4]] },
  { id: 15, name: 'Bottom Hump', coords: [[2, 0], [1, 1], [1, 2], [1, 3], [2, 4]] },
  { id: 16, name: 'Deep Valley', coords: [[0, 0], [0, 1], [2, 2], [0, 3], [0, 4]] },
  { id: 17, name: 'High Peak', coords: [[2, 0], [2, 1], [0, 2], [2, 3], [2, 4]] },
  { id: 18, name: 'Wide Top Zigzag', coords: [[0, 0], [2, 1], [0, 2], [2, 3], [0, 4]] },
  { id: 19, name: 'Wide Bottom Zigzag', coords: [[2, 0], [0, 1], [2, 2], [0, 3], [2, 4]] },
  { id: 20, name: 'Center Diamond', coords: [[1, 0], [0, 1], [2, 2], [0, 3], [1, 4]] },
];

export interface WinningLineResult {
  lineId: number;
  name: string;
  symbolId: number;
  symbolCode: string;
  symbolName: string;
  count: number;
  multiplier: number;
  payout: number;
  positions: [number, number][]; // coordinates that formed the win
}

export interface HotlineSpinOptions {
  betAmount: number;
  riskLevel?: RiskLevel;
  bonusBetActive?: boolean;
  isFreeSpin?: boolean;
  customGrid?: number[][];
}

export interface HotlineSlotSpinResult {
  rawGrid: number[][];           // Initial 3x5 grid before expansion
  expandedGrid: number[][];      // Final 3x5 grid after Expanding Wilds
  expandedReels: number[];       // Reel indices (0..4) that triggered Expanding Wild
  winningLines: WinningLineResult[];
  scatterCount: number;
  scatterMultiplier: number;
  scatterPayout: number;
  scatterPositions: [number, number][];
  totalMultiplier: number;
  totalPayout: number;
  isWin: boolean;
  isBigWin: boolean;             // >= 20x bet
  isMegaWin: boolean;            // >= 50x bet
  // Special Features
  riskLevel: RiskLevel;
  bonusBetActive: boolean;
  isFreeSpinRound: boolean;
  freeSpinsAwarded: number;
  isFreeSpinsTriggered: boolean;
  isRetrigger: boolean;
  baseBet: number;
  totalBet: number;
}

/**
 * Cryptographically secure random float in range [0, 1)
 */
export function secureRandomFloat(): number {
  const buf = crypto.randomBytes(4);
  return buf.readUInt32BE(0) / 4294967296;
}

/**
 * Calculate total bet including bonus bet / free spin
 */
export function calculateTotalBet(
  baseBet: number,
  bonusBetActive = false,
  isFreeSpin = false
): number {
  if (isFreeSpin) return 0;
  if (bonusBetActive) return +(baseBet * 1.5).toFixed(2);
  return baseBet;
}

/**
 * Exact overall appearance probability for SCATTER symbol: 1.00% (PRD Requirement)
 * Server-authoritative and identical in both LOW RISK and HIGH RISK modes.
 */
export const SCATTER_PROBABILITY = 0.01; // Exactly 1%

/**
 * Theoretical Mathematical Model Metadata
 */
export const HOTLINE_THEORETICAL_MATH = {
  targetRtp: 0.96,
  targetRtpPercent: '96.0%',
  scatterProbability: SCATTER_PROBABILITY,
  scatterProbabilityPercent: '1.0%',
  modes: {
    LOW: {
      volatility: 'LOW',
      targetRtp: '96.0%',
      expectedWinRate: '42.1%',
      description: 'Balanced low-variance payouts with frequent line wins and steady demo balance',
    },
    HIGH: {
      volatility: 'HIGH',
      targetRtp: '96.0%',
      expectedWinRate: '44.4%',
      description: 'High volatility, massive 5-of-a-kind multipliers (up to 1050x) and big win potential',
    },
  },
};

/**
 * Roll a symbol with calibrated probabilities.
 * The SCATTER symbol is strictly configured to exactly 1% appearance probability
 * in both LOW RISK and HIGH RISK modes.
 * Wild appearance rate and regular symbol distributions are rebalanced to reduce
 * excessive hit frequency down to ~42%-44% and align theoretical RTP to 96.0%.
 */
export function rollSymbol(
  riskLevel: RiskLevel = 'LOW',
  bonusBetActive = false,
  isFreeSpin = false,
  forcedRandom?: number
): number {
  const r = forcedRandom !== undefined ? forcedRandom : secureRandomFloat();

  // Exactly 1.00% Scatter appearance probability across all modes (PRD Requirement)
  if (r < SCATTER_PROBABILITY) {
    return 7; // SCATTER (Symbol ID 7)
  }

  // Rescale the remaining 99.0% probability space for Wild and regular symbols
  const rRem = (r - SCATTER_PROBABILITY) / (1 - SCATTER_PROBABILITY);

  // Calibrated wild frequency: keeps expanding wilds exciting while reducing runaway win frequency
  const wildProb = bonusBetActive || isFreeSpin
    ? (riskLevel === 'HIGH' ? 0.020 : 0.028)
    : (riskLevel === 'HIGH' ? 0.007 : 0.012);

  if (rRem < wildProb) {
    return 0; // WILD (Symbol ID 0)
  }

  const rSym = (rRem - wildProb) / (1 - wildProb);

  if (riskLevel === 'LOW') {
    // LOW RISK: Rebalanced symbol distribution across 6 regular symbols (1..6)
    if (rSym < 0.11) return 1;       // NEON_7 (11%)
    if (rSym < 0.24) return 2;       // HOTLINE_PHONE (13%)
    if (rSym < 0.40) return 3;       // SPORTS_CAR (16%)
    if (rSym < 0.58) return 4;       // PALM_TREE (18%)
    if (rSym < 0.79) return 5;       // CASSETTE (21%)
    return 6;                        // STAR (21%)
  } else {
    // HIGH RISK: Higher dispersion toward top-tier symbols, high volatility
    if (rSym < 0.08) return 1;       // NEON_7 (8%)
    if (rSym < 0.19) return 2;       // HOTLINE_PHONE (11%)
    if (rSym < 0.34) return 3;       // SPORTS_CAR (15%)
    if (rSym < 0.53) return 4;       // PALM_TREE (19%)
    if (rSym < 0.76) return 5;       // CASSETTE (23%)
    return 6;                        // STAR (24%)
  }
}

/**
 * Generate a 3x5 grid of symbols (3 rows, 5 columns)
 */
export function generateSlotGrid(
  riskLevel: RiskLevel = 'LOW',
  bonusBetActive = false,
  isFreeSpin = false
): number[][] {
  const grid: number[][] = [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ];

  for (let col = 0; col < 5; col++) {
    for (let row = 0; row < 3; row++) {
      grid[row][col] = rollSymbol(riskLevel, bonusBetActive, isFreeSpin);
    }
  }

  return grid;
}

/**
 * Evaluates Expanding Wilds on the grid:
 * Any reel column containing at least one Wild (0) expands vertically
 * to cover all 3 rows of that reel.
 */
export function processExpandingWilds(initialGrid: number[][]): {
  expandedGrid: number[][];
  expandedReels: number[];
} {
  const expandedGrid = initialGrid.map((row) => [...row]);
  const expandedReels: number[] = [];

  for (let col = 0; col < 5; col++) {
    let hasWild = false;
    for (let row = 0; row < 3; row++) {
      if (initialGrid[row][col] === 0) {
        hasWild = true;
        break;
      }
    }

    if (hasWild) {
      expandedReels.push(col);
      for (let row = 0; row < 3; row++) {
        // Expand wild vertically while preserving SCATTER symbols (symbol 7) on the grid
        if (initialGrid[row][col] !== 7) {
          expandedGrid[row][col] = 0;
        }
      }
    }
  }

  return { expandedGrid, expandedReels };
}

/**
 * Calculate Free Spins awarded based on Scatter count
 */
export function calculateFreeSpinsAwarded(
  scatterCount: number,
  isCurrentlyFreeSpin = false
): { freeSpins: number; isTriggered: boolean; isRetrigger: boolean } {
  if (isCurrentlyFreeSpin) {
    // Retrigger during Free Spins: 3+ Scatters award +5 spins
    if (scatterCount >= 3) {
      return { freeSpins: 5, isTriggered: true, isRetrigger: true };
    }
    return { freeSpins: 0, isTriggered: false, isRetrigger: false };
  } else {
    // Base game trigger: 3 Scatters=10, 4=15, 5=20
    if (scatterCount >= 5) return { freeSpins: 20, isTriggered: true, isRetrigger: false };
    if (scatterCount === 4) return { freeSpins: 15, isTriggered: true, isRetrigger: false };
    if (scatterCount === 3) return { freeSpins: 10, isTriggered: true, isRetrigger: false };
    return { freeSpins: 0, isTriggered: false, isRetrigger: false };
  }
}

/**
 * Evaluates paylines and scatter wins on the final grid
 */
export function evaluateHotlineSlot(
  grid: number[][],
  baseBet: number,
  riskLevel: RiskLevel = 'LOW'
): {
  winningLines: WinningLineResult[];
  scatterCount: number;
  scatterMultiplier: number;
  scatterPayout: number;
  scatterPositions: [number, number][];
  totalMultiplier: number;
  totalPayout: number;
  isWin: boolean;
  isBigWin: boolean;
  isMegaWin: boolean;
} {
  const paytable = riskLevel === 'HIGH' ? HOTLINE_SYMBOLS_HIGH : HOTLINE_SYMBOLS_LOW;
  const lineCount = HOTLINE_PAYLINES.length; // 20
  const lineBet = +(baseBet / lineCount).toFixed(2);
  const winningLines: WinningLineResult[] = [];

  let totalLinePayout = 0;
  let totalLineMultiplier = 0;

  for (const pl of HOTLINE_PAYLINES) {
    const lineSymbols = pl.coords.map(([r, c]) => grid[r][c]);

    // Scatters do not pay on paylines (they pay anywhere on the grid)
    if (lineSymbols[0] === 7) {
      continue;
    }

    // Determine target symbol: first non-wild non-scatter symbol, or wild if all are wild
    let firstRegular = lineSymbols.find((s) => s !== 0 && s !== 7);
    const targetSym = firstRegular !== undefined ? firstRegular : 0;

    let matchCount = 0;
    const matchPositions: [number, number][] = [];

    for (let i = 0; i < lineSymbols.length; i++) {
      const s = lineSymbols[i];
      if (s === targetSym || (s === 0 && targetSym !== 7)) {
        matchCount++;
        matchPositions.push(pl.coords[i]);
      } else {
        break;
      }
    }

    if (matchCount >= 3) {
      const symDef = paytable.find((s) => s.id === targetSym) || paytable[0];
      const mult = symDef.payouts[matchCount] || 0;
      if (mult > 0) {
        const payout = +(lineBet * mult).toFixed(2);
        totalLineMultiplier += mult / lineCount;
        totalLinePayout += payout;

        winningLines.push({
          lineId: pl.id,
          name: pl.name,
          symbolId: targetSym,
          symbolCode: symDef.code,
          symbolName: symDef.name,
          count: matchCount,
          multiplier: mult,
          payout,
          positions: matchPositions,
        });
      }
    }
  }

  // Evaluate Scatters (Symbol ID 7) anywhere on grid
  let scatterCount = 0;
  const scatterPositions: [number, number][] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 5; c++) {
      if (grid[r][c] === 7) {
        scatterCount++;
        scatterPositions.push([r, c]);
      }
    }
  }

  let scatterMultiplier = 0;
  let scatterPayout = 0;
  if (scatterCount >= 2) {
    const scatterDef = paytable.find((s) => s.id === 7)!;
    scatterMultiplier = scatterDef.payouts[Math.min(5, scatterCount)] || 0;
    scatterPayout = +(baseBet * scatterMultiplier).toFixed(2);
  }

  const totalPayout = +(totalLinePayout + scatterPayout).toFixed(2);
  const totalMultiplier = +(totalLineMultiplier + scatterMultiplier).toFixed(2);

  return {
    winningLines,
    scatterCount,
    scatterMultiplier,
    scatterPayout,
    scatterPositions,
    totalMultiplier,
    totalPayout,
    isWin: totalPayout > 0,
    isBigWin: totalMultiplier >= 20.0,
    isMegaWin: totalMultiplier >= 50.0,
  };
}

/**
 * Execute a complete spin:
 * Supports betAmount, riskLevel ('LOW' | 'HIGH'), bonusBetActive, and isFreeSpin
 */
export function executeHotlineSlotSpin(
  optionsOrBet: number | HotlineSpinOptions,
  legacyGrid?: number[][]
): HotlineSlotSpinResult {
  const options: HotlineSpinOptions =
    typeof optionsOrBet === 'number'
      ? { betAmount: optionsOrBet, customGrid: legacyGrid }
      : optionsOrBet;

  const {
    betAmount,
    riskLevel = 'LOW',
    bonusBetActive = false,
    isFreeSpin = false,
    customGrid,
  } = options;

  const totalBet = calculateTotalBet(betAmount, bonusBetActive, isFreeSpin);
  const rawGrid = customGrid || generateSlotGrid(riskLevel, bonusBetActive, isFreeSpin);
  const { expandedGrid, expandedReels } = processExpandingWilds(rawGrid);
  const evaluation = evaluateHotlineSlot(expandedGrid, betAmount, riskLevel);

  const freeSpinsInfo = calculateFreeSpinsAwarded(evaluation.scatterCount, isFreeSpin);

  return {
    rawGrid,
    expandedGrid,
    expandedReels,
    riskLevel,
    bonusBetActive,
    isFreeSpinRound: isFreeSpin,
    freeSpinsAwarded: freeSpinsInfo.freeSpins,
    isFreeSpinsTriggered: freeSpinsInfo.isTriggered,
    isRetrigger: freeSpinsInfo.isRetrigger,
    baseBet: betAmount,
    totalBet,
    ...evaluation,
  };
}
