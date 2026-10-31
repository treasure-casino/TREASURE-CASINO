import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../prisma';
import { ApiError } from '../utils/ApiError';
import { DemoWalletService } from '../services/demoWallet.service';

const SERVER_SECRET = process.env.JWT_SECRET || 'treasure_casino_provably_fair_salt_2026';

// ─── TREASURE KINGDOM PAYTABLE & PAYLINES (9 ORIGINAL SYMBOLS) ───────────────
interface SlotSymbol {
  id: number;
  name: string;
  isWild?: boolean;
  isScatter?: boolean;
  payouts: Record<number, number>; // count -> multiplier
}

const SLOT_SYMBOLS: SlotSymbol[] = [
  { id: 0, name: 'Wild – Lightning', isWild: true, payouts: { 5: 150, 4: 40, 3: 15 } },
  { id: 1, name: 'Golden Crown', payouts: { 5: 100, 4: 30, 3: 10 } },
  { id: 2, name: 'Treasure Chest', payouts: { 5: 60, 4: 20, 3: 8 } },
  { id: 3, name: 'Diamond', payouts: { 5: 40, 4: 15, 3: 6 } },
  { id: 4, name: 'Ruby', payouts: { 5: 25, 4: 10, 3: 4 } },
  { id: 5, name: 'Emerald', payouts: { 5: 20, 4: 8, 3: 3 } },
  { id: 6, name: 'Gold Coin', payouts: { 5: 15, 4: 6, 3: 2 } },
  { id: 7, name: 'Ancient Key', payouts: { 5: 10, 4: 4, 3: 1.5 } },
  { id: 8, name: 'Scatter – Treasure Star', isScatter: true, payouts: { 5: 100, 4: 20, 3: 5 } },
];

const PAYLINES = [
  { id: 1, name: 'Middle Row', coords: [[1, 0], [1, 1], [1, 2], [1, 3], [1, 4]] },
  { id: 2, name: 'Top Row', coords: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] },
  { id: 3, name: 'Bottom Row', coords: [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4]] },
  { id: 4, name: 'V-Shape', coords: [[0, 0], [1, 1], [2, 2], [1, 3], [0, 4]] },
  { id: 5, name: 'Inverted-V', coords: [[2, 0], [1, 1], [0, 2], [1, 3], [2, 4]] },
  { id: 6, name: 'Step-Down', coords: [[0, 0], [0, 1], [1, 2], [2, 3], [2, 4]] },
  { id: 7, name: 'Step-Up', coords: [[2, 0], [2, 1], [1, 2], [0, 3], [0, 4]] },
  { id: 8, name: 'Trough', coords: [[1, 0], [2, 1], [2, 2], [2, 3], [1, 4]] },
  { id: 9, name: 'Crest', coords: [[1, 0], [0, 1], [0, 2], [0, 3], [1, 4]] },
  { id: 10, name: 'Z-Line', coords: [[0, 0], [1, 1], [1, 2], [1, 3], [0, 4]] },
];

// Helper: Secure Random Float [0, 1)
function secureRandomFloat(): number {
  const buf = crypto.randomBytes(4);
  return buf.readUInt32BE(0) / 4294967296;
}

// ─── CONTROLLER IMPLEMENTATION ──────────────────────────────────────────────

export const getDemoWallet = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawToken = (req.query.token as string) || (req.headers['x-demo-token'] as string);
    const wallet = await DemoWalletService.getOrCreateWallet(rawToken);
    res.json({ success: true, data: wallet });
  } catch (error) {
    next(error);
  }
};

export const resetDemoWallet = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawToken = req.body?.token || (req.headers['x-demo-token'] as string);
    const balance = await DemoWalletService.resetWallet(rawToken);
    res.json({ success: true, data: { balance } });
  } catch (error) {
    next(error);
  }
};

// ─── 1. TREASURE KINGDOM (5 REELS x 3 ROWS ORIGINAL 9-SYMBOL ENGINE) ─────────
export const spinTreasureKingdom = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { betAmount = 50, demoToken } = req.body;
    const bet = parseFloat(betAmount);

    if (isNaN(bet) || bet < 10 || bet > 5000) {
      throw ApiError.badRequest('Bet amount must be between ₹10 and ₹5,000');
    }

    const wallet = await DemoWalletService.getOrCreateWallet(demoToken);
    const { balanceBefore, balanceAfter: balanceAfterBet } = await DemoWalletService.deductBet(wallet.id, bet);

    // Generate 5x3 Grid (3 rows, 5 reels: 15 cells)
    const grid: number[][] = [
      [0, 0, 0, 0, 0], // row 0 (top)
      [0, 0, 0, 0, 0], // row 1 (middle)
      [0, 0, 0, 0, 0], // row 2 (bottom)
    ];

    // Symbol generation with realistic casino RTP distribution
    for (let col = 0; col < 5; col++) {
      for (let row = 0; row < 3; row++) {
        const rand = secureRandomFloat();
        let sym = 7; // Ancient Key default
        if (rand < 0.04) sym = 0;      // Wild Symbol - 4%
        else if (rand < 0.12) sym = 1; // Golden Crown - 8%
        else if (rand < 0.22) sym = 2; // Treasure Chest - 10%
        else if (rand < 0.34) sym = 3; // Diamond - 12%
        else if (rand < 0.48) sym = 4; // Ruby - 14%
        else if (rand < 0.63) sym = 5; // Emerald - 15%
        else if (rand < 0.81) sym = 6; // Gold Coin - 18%
        else if (rand < 0.96) sym = 7; // Ancient Key - 15%
        else sym = 8;                  // Scatter Symbol - 4%

        grid[row][col] = sym;
      }
    }

    // Evaluate 10 Paylines (Line Bet = Total Bet / 10)
    const lineBet = +(bet / 10).toFixed(2);
    const winningLines: Array<{
      lineId: number;
      name: string;
      symbolId: number;
      symbolName: string;
      count: number;
      multiplier: number;
      payout: number;
    }> = [];

    let totalLineMultiplier = 0;
    let totalLinePayout = 0;

    for (const pl of PAYLINES) {
      const lineSymbols = pl.coords.map(([r, c]) => grid[r][c]);

      // Scatters do not form payline combinations (they pay anywhere)
      if (lineSymbols[0] === 8) {
        continue;
      }

      // Determine match starting from leftmost reel
      let baseSym = lineSymbols[0];
      // If first symbol is Wild (0), look ahead for the target symbol
      let firstNonWild = lineSymbols.find((s) => s !== 0 && s !== 8);
      const targetSym = firstNonWild !== undefined ? firstNonWild : 0;

      let matchCount = 0;
      for (const s of lineSymbols) {
        if (s === targetSym || (s === 0 && targetSym !== 8)) {
          matchCount++;
        } else {
          break;
        }
      }

      if (matchCount >= 3) {
        const symDef = SLOT_SYMBOLS.find((s) => s.id === targetSym) || SLOT_SYMBOLS[0];
        const mult = symDef.payouts[matchCount] || 0;
        if (mult > 0) {
          const payout = +(lineBet * mult).toFixed(2);
          totalLineMultiplier += mult / 10;
          totalLinePayout += payout;
          winningLines.push({
            lineId: pl.id,
            name: pl.name,
            symbolId: targetSym,
            symbolName: symDef.name,
            count: matchCount,
            multiplier: mult,
            payout,
          });
        }
      }
    }

    // Evaluate Scatter Symbols anywhere on the 5x3 grid
    let scatterCount = 0;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 5; c++) {
        if (grid[r][c] === 8) {
          scatterCount++;
        }
      }
    }

    let scatterMultiplier = 0;
    let scatterPayout = 0;
    if (scatterCount >= 3) {
      const scatterDef = SLOT_SYMBOLS.find((s) => s.id === 8)!;
      scatterMultiplier = scatterDef.payouts[Math.min(5, scatterCount)] || 0;
      scatterPayout = +(bet * scatterMultiplier).toFixed(2);
    }

    const totalPayout = +(totalLinePayout + scatterPayout).toFixed(2);
    const totalMultiplier = +(totalLineMultiplier + scatterMultiplier).toFixed(2);
    let finalBalance = balanceAfterBet;

    if (totalPayout > 0) {
      finalBalance = await DemoWalletService.creditWin(wallet.id, totalPayout);
    }

    // Record authoritative round
    const round = await prisma.demoGameRound.create({
      data: {
        demoWalletId: wallet.id,
        gameId: 'game-slot-01',
        engine: 'SLOTS_5X3',
        status: totalPayout > 0 ? 'WON' : 'LOST',
        betAmount: bet,
        payout: totalPayout,
        multiplier: totalMultiplier,
        balanceBefore,
        balanceAfter: finalBalance,
        publicState: JSON.stringify({ grid, winningLines, scatterCount, scatterPayout }),
        settledAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        roundId: round.id,
        grid,
        winningLines,
        scatterWin: {
          count: scatterCount,
          multiplier: scatterMultiplier,
          payout: scatterPayout,
        },
        totalMultiplier,
        totalPayout,
        isWin: totalPayout > 0,
        balanceBefore,
        balanceAfter: finalBalance,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── 2. SKY ROCKET (3D CRASH ENGINE WITH DUAL BET SLOTS) ─────────────────────
export const startSkyRocket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { betAmount, bets: inputBets, demoToken } = req.body;

    // Support dual bets array [{ slot: 1, betAmount: 50 }, { slot: 2, betAmount: 100 }]
    // or fallback to single betAmount or spectator round []
    let parsedBets: Array<{
      slot: number;
      betAmount: number;
      autoCashout?: number;
      autoCashoutEnabled?: boolean;
    }> = [];

    if (Array.isArray(inputBets)) {
      parsedBets = inputBets
        .filter((b: any) => parseFloat(b.betAmount) > 0)
        .map((b: any) => ({
          slot: parseInt(b.slot, 10) || 1,
          betAmount: parseFloat(b.betAmount),
          autoCashout: b.autoCashout ? parseFloat(b.autoCashout) : undefined,
          autoCashoutEnabled: Boolean(b.autoCashoutEnabled),
        }));
    } else if (betAmount !== undefined && betAmount !== null) {
      const singleBet = parseFloat(betAmount);
      if (!isNaN(singleBet) && singleBet > 0) {
        parsedBets = [{ slot: 1, betAmount: singleBet }];
      }
    }

    // Validate each placed bet
    let totalBet = 0;
    const betsMap: Record<string, any> = {};

    for (const b of parsedBets) {
      if (isNaN(b.betAmount) || b.betAmount < 10 || b.betAmount > 5000) {
        throw ApiError.badRequest(`Bet for Slot ${b.slot} must be between ₹10 and ₹5,000`);
      }
      totalBet += b.betAmount;
      betsMap[b.slot.toString()] = {
        slot: b.slot,
        betAmount: b.betAmount,
        status: 'ACTIVE',
        payout: 0,
        multiplier: 0,
        autoCashout: b.autoCashout,
        autoCashoutEnabled: b.autoCashoutEnabled,
      };
    }

    const wallet = await DemoWalletService.getOrCreateWallet(demoToken);
    let balanceBefore = parseFloat(wallet.balance.toString());
    let balanceAfter = balanceBefore;

    if (totalBet > 0) {
      const deduction = await DemoWalletService.deductBet(wallet.id, totalBet);
      balanceBefore = deduction.balanceBefore;
      balanceAfter = deduction.balanceAfter;
    }

    // Provably Fair Crash Point Generation (House Edge ~3.0%, RTP ~97.0%)
    const rand = secureRandomFloat();
    let crashPoint = 1.0;
    if (rand >= 0.03) {
      crashPoint = Math.min(100.0, +(0.97 / (1.0 - rand)).toFixed(2));
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const commitment = crypto
      .createHmac('sha256', SERVER_SECRET)
      .update(`${crashPoint}:${salt}`)
      .digest('hex');

    const startTime = Date.now();

    const round = await prisma.demoGameRound.create({
      data: {
        demoWalletId: wallet.id,
        gameId: 'game-crash-01',
        engine: 'CRASH_ROCKET',
        status: 'ACTIVE',
        betAmount: totalBet,
        payout: 0,
        multiplier: 0,
        balanceBefore,
        balanceAfter,
        publicState: JSON.stringify({ bets: betsMap }),
        secretState: JSON.stringify({ crashPoint, salt, startTime }),
        commitment,
      },
    });

    res.json({
      success: true,
      data: {
        roundId: round.id,
        commitment,
        startTime,
        balanceAfter,
        crashPoint,
        bets: betsMap,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const cashoutSkyRocket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { roundId, claimedMultiplier, slot = 1 } = req.body;

    if (!roundId) {
      throw ApiError.badRequest('roundId is required');
    }

    const round = await prisma.demoGameRound.findUnique({
      where: { id: roundId },
    });

    if (!round || round.status !== 'ACTIVE') {
      throw ApiError.badRequest('Round is not currently active');
    }

    const secret = JSON.parse(round.secretState || '{}');
    const { crashPoint, startTime } = secret;

    const publicState = JSON.parse(round.publicState || '{"bets":{}}');
    const slotKey = slot.toString();
    const slotBetInfo = publicState.bets?.[slotKey];

    // If slot exists, check if already settled
    if (slotBetInfo && slotBetInfo.status !== 'ACTIVE') {
      throw ApiError.badRequest(`Slot ${slot} has already been cashed out or settled`);
    }

    if (!slotBetInfo && (!round.betAmount || parseFloat(round.betAmount.toString()) <= 0)) {
      throw ApiError.badRequest(`No active bet placed on Slot ${slot}`);
    }

    const betAmountForSlot = slotBetInfo ? slotBetInfo.betAmount : parseFloat(round.betAmount.toString());

    // Validate elapsed time against claimed multiplier
    // Multiplier growth formula: M(t) = exp(0.065 * t * 2.2)
    // Note: Flight begins after 3-second ignition countdown
    const elapsedSec = Math.max(0, (Date.now() - startTime - 3000) / 1000);
    const maxAllowedMult = +(Math.exp(0.065 * (elapsedSec + 0.8) * 2.2) + 0.1).toFixed(2);
    const claimed = parseFloat(claimedMultiplier);

    if (isNaN(claimed) || claimed < 1.0) {
      throw ApiError.badRequest('Invalid multiplier claim');
    }

    if (claimed > maxAllowedMult) {
      throw ApiError.badRequest('Invalid multiplier claim timing');
    }

    if (claimed >= crashPoint) {
      // Slot crashed before cashout reached server
      if (slotBetInfo) {
        slotBetInfo.status = 'CRASHED';
        slotBetInfo.multiplier = crashPoint;
        slotBetInfo.payout = 0;
      }

      const allBets = Object.values(publicState.bets || {});
      const anyActive = allBets.some((b: any) => b.status === 'ACTIVE');

      if (!anyActive) {
        await prisma.demoGameRound.update({
          where: { id: roundId },
          data: {
            status: 'CRASHED',
            multiplier: crashPoint,
            publicState: JSON.stringify(publicState),
            settledAt: new Date(),
          },
        });
      } else {
        await prisma.demoGameRound.update({
          where: { id: roundId },
          data: {
            publicState: JSON.stringify(publicState),
          },
        });
      }

      res.json({
        success: true,
        data: {
          outcome: 'CRASHED',
          slot,
          crashPoint,
          payout: 0,
          balanceAfter: parseFloat(round.balanceAfter?.toString() || '0'),
          bets: publicState.bets,
        },
      });
      return;
    }

    // Successful Cashout for this slot
    const payout = +(betAmountForSlot * claimed).toFixed(2);
    const newBalance = await DemoWalletService.creditWin(round.demoWalletId, payout);

    if (slotBetInfo) {
      slotBetInfo.status = 'CASHOUT';
      slotBetInfo.multiplier = claimed;
      slotBetInfo.payout = payout;
    }

    const allBets = Object.values(publicState.bets || {});
    const anyActive = allBets.some((b: any) => b.status === 'ACTIVE');
    const totalPayout = allBets.reduce((sum: number, b: any) => sum + (b.payout || 0), 0);

    await prisma.demoGameRound.update({
      where: { id: roundId },
      data: {
        status: anyActive ? 'ACTIVE' : 'CASHOUT',
        multiplier: claimed,
        payout: totalPayout > 0 ? totalPayout : payout,
        balanceAfter: newBalance,
        publicState: JSON.stringify(publicState),
        settledAt: anyActive ? null : new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        outcome: 'CASHOUT',
        slot,
        multiplier: claimed,
        payout,
        crashPoint,
        balanceAfter: newBalance,
        bets: publicState.bets,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const crashSkyRocket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { roundId } = req.body;

    const round = await prisma.demoGameRound.findUnique({
      where: { id: roundId },
    });

    if (!round || round.status !== 'ACTIVE') {
      res.json({ success: true, message: 'Round already resolved' });
      return;
    }

    const secret = JSON.parse(round.secretState || '{}');
    const { crashPoint } = secret;

    const publicState = JSON.parse(round.publicState || '{"bets":{}}');
    if (publicState.bets) {
      for (const k of Object.keys(publicState.bets)) {
        if (publicState.bets[k].status === 'ACTIVE') {
          publicState.bets[k].status = 'CRASHED';
          publicState.bets[k].multiplier = crashPoint;
          publicState.bets[k].payout = 0;
        }
      }
    }

    await prisma.demoGameRound.update({
      where: { id: roundId },
      data: {
        status: 'CRASHED',
        multiplier: crashPoint,
        publicState: JSON.stringify(publicState),
        settledAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        outcome: 'CRASHED',
        crashPoint,
        payout: 0,
        balanceAfter: parseFloat(round.balanceAfter?.toString() || '0'),
        bets: publicState.bets,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getSkyRocketStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const roundId = req.params.roundId as string;
    const round = await prisma.demoGameRound.findUnique({
      where: { id: roundId },
    });
    if (!round) {
      throw ApiError.notFound('Round not found');
    }
    const secret = JSON.parse(round.secretState || '{}');
    const publicState = JSON.parse(round.publicState || '{"bets":{}}');
    res.json({
      success: true,
      data: {
        id: round.id,
        status: round.status,
        betAmount: parseFloat(round.betAmount.toString()),
        payout: parseFloat(round.payout.toString()),
        multiplier: parseFloat(round.multiplier.toString()),
        crashPoint: round.status !== 'ACTIVE' ? secret.crashPoint : undefined,
        balanceAfter: parseFloat(round.balanceAfter?.toString() || '0'),
        bets: publicState.bets,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getSkyRocketHistory = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rounds = await prisma.demoGameRound.findMany({
      where: { gameId: 'game-crash-01', status: { in: ['CRASHED', 'CASHOUT'] } },
      orderBy: { startedAt: 'desc' },
      take: 10,
    });

    const history = rounds.map((r) => {
      const secret = JSON.parse(r.secretState || '{}');
      return secret.crashPoint || parseFloat(r.multiplier.toString()) || 1.0;
    });

    // Provide default fallback history if brand new database
    const finalHistory = history.length > 0 ? history : [1.42, 2.85, 1.15, 6.4, 1.95, 3.1, 1.05, 15.2];

    res.json({ success: true, data: finalHistory });
  } catch (error) {
    next(error);
  }
};

// ─── 3. CRYSTAL MINES (5x5 GRID MINES ENGINE) ────────────────────────────────
function getMinesMultiplier(mineCount: number, revealed: number): number {
  if (revealed === 0) return 1.0;
  let prob = 1.0;
  for (let i = 0; i < revealed; i++) {
    prob *= (25 - mineCount - i) / (25 - i);
  }
  return Math.max(1.01, +(0.97 / prob).toFixed(2));
}

export const startCrystalMines = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { betAmount = 50, mineCount = 3, demoToken } = req.body;
    const bet = parseFloat(betAmount);
    const mines = parseInt(mineCount, 10);

    if (isNaN(bet) || bet < 10 || bet > 5000) {
      throw ApiError.badRequest('Bet amount must be between ₹10 and ₹5,000');
    }

    if (isNaN(mines) || mines < 1 || mines > 24) {
      throw ApiError.badRequest('Mine count must be between 1 and 24');
    }

    const wallet = await DemoWalletService.getOrCreateWallet(demoToken);
    const { balanceBefore, balanceAfter } = await DemoWalletService.deductBet(wallet.id, bet);

    // Shuffle and pick `mines` distinct positions out of 25
    const positions = Array.from({ length: 25 }, (_, i) => i);
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(secureRandomFloat() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    const minePositions = positions.slice(0, mines);

    const round = await prisma.demoGameRound.create({
      data: {
        demoWalletId: wallet.id,
        gameId: 'game-mines-01',
        engine: 'MINES_5X5',
        status: 'ACTIVE',
        betAmount: bet,
        payout: 0,
        multiplier: 1.0,
        balanceBefore,
        balanceAfter,
        secretState: JSON.stringify({ minePositions, revealedTiles: [] }),
      },
    });

    res.json({
      success: true,
      data: {
        roundId: round.id,
        mineCount: mines,
        tilesTotal: 25,
        balanceAfter,
        currentMultiplier: 1.0,
        nextMultiplier: getMinesMultiplier(mines, 1),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const revealCrystalTile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { roundId, tileIndex } = req.body;
    const tile = parseInt(tileIndex, 10);

    if (isNaN(tile) || tile < 0 || tile > 24) {
      throw ApiError.badRequest('tileIndex must be between 0 and 24');
    }

    const round = await prisma.demoGameRound.findUnique({
      where: { id: roundId },
    });

    if (!round || round.status !== 'ACTIVE') {
      throw ApiError.badRequest('Round is not currently active');
    }

    const secret = JSON.parse(round.secretState || '{}');
    const { minePositions = [], revealedTiles = [] } = secret;

    if (revealedTiles.includes(tile)) {
      throw ApiError.badRequest('Tile already revealed');
    }

    revealedTiles.push(tile);
    const hitMine = minePositions.includes(tile);

    if (hitMine) {
      // Hit Mine: Round Lost
      await prisma.demoGameRound.update({
        where: { id: roundId },
        data: {
          status: 'LOST',
          payout: 0,
          secretState: JSON.stringify({ minePositions, revealedTiles }),
          settledAt: new Date(),
        },
      });

      res.json({
        success: true,
        data: {
          hitMine: true,
          tileIndex: tile,
          minePositions,
          payout: 0,
          balanceAfter: parseFloat(round.balanceAfter?.toString() || '0'),
        },
      });
      return;
    }

    // Safe Gem
    const mineCount = minePositions.length;
    const revealedCount = revealedTiles.length;
    const currentMultiplier = getMinesMultiplier(mineCount, revealedCount);
    const nextMultiplier = revealedCount < 25 - mineCount ? getMinesMultiplier(mineCount, revealedCount + 1) : currentMultiplier;
    const isMaxWin = revealedCount === 25 - mineCount;

    let finalBalance = parseFloat(round.balanceAfter?.toString() || '0');
    let payout = 0;

    if (isMaxWin) {
      const bet = parseFloat(round.betAmount.toString());
      payout = +(bet * currentMultiplier).toFixed(2);
      finalBalance = await DemoWalletService.creditWin(round.demoWalletId, payout);

      await prisma.demoGameRound.update({
        where: { id: roundId },
        data: {
          status: 'MAX_WIN',
          multiplier: currentMultiplier,
          payout,
          balanceAfter: finalBalance,
          secretState: JSON.stringify({ minePositions, revealedTiles }),
          settledAt: new Date(),
        },
      });
    } else {
      await prisma.demoGameRound.update({
        where: { id: roundId },
        data: {
          multiplier: currentMultiplier,
          secretState: JSON.stringify({ minePositions, revealedTiles }),
        },
      });
    }

    res.json({
      success: true,
      data: {
        hitMine: false,
        tileIndex: tile,
        revealedCount,
        currentMultiplier,
        nextMultiplier,
        isMaxWin,
        payout,
        minePositions: isMaxWin ? minePositions : undefined,
        balanceAfter: finalBalance,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const cashoutCrystalMines = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { roundId } = req.body;

    const round = await prisma.demoGameRound.findUnique({
      where: { id: roundId },
    });

    if (!round || round.status !== 'ACTIVE') {
      throw ApiError.badRequest('Round is not currently active');
    }

    const secret = JSON.parse(round.secretState || '{}');
    const { minePositions = [], revealedTiles = [] } = secret;

    if (revealedTiles.length === 0) {
      throw ApiError.badRequest('Must reveal at least one tile before cashout');
    }

    const multiplier = parseFloat(round.multiplier.toString());
    const bet = parseFloat(round.betAmount.toString());
    const payout = +(bet * multiplier).toFixed(2);

    const newBalance = await DemoWalletService.creditWin(round.demoWalletId, payout);

    await prisma.demoGameRound.update({
      where: { id: roundId },
      data: {
        status: 'CASHOUT',
        payout,
        balanceAfter: newBalance,
        settledAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        outcome: 'CASHOUT',
        multiplier,
        payout,
        minePositions,
        balanceAfter: newBalance,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── 4. TREASURE VORTEX (3D ELEMENTAL VORTEX CRASH ENGINE) ───────────────────

export interface ElementalSurgeDef {
  element: 'FIRE' | 'WATER' | 'EARTH' | 'LIGHTNING';
  triggerMultiplier: number;
  description: string;
  boost?: number;
  shield?: boolean;
  floor?: number;
  speedMult?: number;
}

export const startTreasureVortex = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { betAmount = 50, autoCashout, demoToken } = req.body;
    const bet = parseFloat(betAmount);

    if (isNaN(bet) || bet < 10 || bet > 5000) {
      throw ApiError.badRequest('Bet amount must be between ₹10 and ₹5,000');
    }

    const wallet = await DemoWalletService.getOrCreateWallet(demoToken);
    const { balanceBefore, balanceAfter } = await DemoWalletService.deductBet(wallet.id, bet);

    // Provably Fair Crash Point Generation (House Edge ~3.0%, RTP ~97.0%)
    const rand = secureRandomFloat();
    let crashPoint = 1.0;
    if (rand >= 0.03) {
      crashPoint = Math.min(100.0, +(0.97 / (1.0 - rand)).toFixed(2));
    }

    // Determine if an Elemental Surge occurs in this round (~45% chance if crashPoint > 1.8)
    let elementalSurge: ElementalSurgeDef | null = null;
    if (crashPoint > 1.8 && secureRandomFloat() < 0.45) {
      const elements: Array<'FIRE' | 'WATER' | 'EARTH' | 'LIGHTNING'> = ['FIRE', 'WATER', 'EARTH', 'LIGHTNING'];
      const chosen = elements[Math.floor(secureRandomFloat() * elements.length)];
      // Trigger multiplier between 1.30x and 65% of crashPoint (max 3.5x)
      const maxTrigger = Math.max(1.4, Math.min(crashPoint * 0.65, 3.5));
      const triggerMultiplier = +(1.30 + secureRandomFloat() * (maxTrigger - 1.30)).toFixed(2);

      if (chosen === 'FIRE') {
        elementalSurge = {
          element: 'FIRE',
          triggerMultiplier,
          description: 'Fire Surge: Instant +0.75x Multiplier Burst!',
          boost: 0.75,
        };
      } else if (chosen === 'WATER') {
        elementalSurge = {
          element: 'WATER',
          triggerMultiplier,
          description: 'Water Surge: Frost Shield active! 100% Bet Refund on collapse.',
          shield: true,
        };
      } else if (chosen === 'EARTH') {
        elementalSurge = {
          element: 'EARTH',
          triggerMultiplier,
          description: 'Earth Surge: Bedrock Multiplier locked at 1.50x minimum!',
          floor: 1.50,
        };
      } else {
        elementalSurge = {
          element: 'LIGHTNING',
          triggerMultiplier,
          description: 'Lightning Surge: Hyper Velocity Vortex active (+50% speed)!',
          speedMult: 1.5,
        };
      }
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const commitment = crypto
      .createHmac('sha256', SERVER_SECRET)
      .update(`${crashPoint}:${salt}`)
      .digest('hex');

    const startTime = Date.now();

    const publicState = {
      initialBet: bet,
      activeBet: bet,
      cashedOutPayout: 0,
      partialCashouts: [] as any[],
      autoCashout: autoCashout ? parseFloat(autoCashout) : undefined,
      elementalSurge,
    };

    const secretState = {
      crashPoint,
      salt,
      startTime,
      initialBet: bet,
      activeBet: bet,
      cashedOutPayout: 0,
      elementalSurge,
    };

    const round = await prisma.demoGameRound.create({
      data: {
        demoWalletId: wallet.id,
        gameId: 'game-vortex-01',
        engine: 'VORTEX_CRASH',
        status: 'ACTIVE',
        betAmount: bet,
        payout: 0,
        multiplier: 0,
        balanceBefore,
        balanceAfter,
        publicState: JSON.stringify(publicState),
        secretState: JSON.stringify(secretState),
        commitment,
      },
    });

    res.json({
      success: true,
      data: {
        roundId: round.id,
        commitment,
        startTime,
        balanceAfter,
        crashPoint,
        elementalSurge,
        autoCashout: publicState.autoCashout,
        initialBet: bet,
        activeBet: bet,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const cashoutTreasureVortex = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { roundId, claimedMultiplier, isPartial = false, fraction = 0.5 } = req.body;

    if (!roundId) {
      throw ApiError.badRequest('roundId is required');
    }

    const round = await prisma.demoGameRound.findUnique({
      where: { id: roundId },
    });

    if (!round || round.status !== 'ACTIVE') {
      throw ApiError.badRequest('Round is not currently active');
    }

    const secret = JSON.parse(round.secretState || '{}');
    const publicState = JSON.parse(round.publicState || '{}');
    const { crashPoint, startTime, elementalSurge } = secret;
    let activeBet = parseFloat(secret.activeBet ?? round.betAmount.toString());

    if (activeBet <= 0) {
      throw ApiError.badRequest('No active bet remaining on this round');
    }

    const claimed = parseFloat(claimedMultiplier);
    if (isNaN(claimed) || claimed < 1.0) {
      throw ApiError.badRequest('Invalid claimed multiplier');
    }

    // Multiplier growth validation
    const elapsedSec = Math.max(0, (Date.now() - startTime) / 1000);
    const speedMult = elementalSurge?.element === 'LIGHTNING' && claimed >= elementalSurge.triggerMultiplier ? 1.5 : 1.0;
    const boostMult = elementalSurge?.element === 'FIRE' && claimed >= elementalSurge.triggerMultiplier ? (elementalSurge.boost || 0.75) : 0;
    const maxAllowedMult = +(Math.exp(0.065 * (elapsedSec + 1.2) * 2.0 * speedMult) + boostMult + 0.25).toFixed(2);

    if (claimed > maxAllowedMult) {
      throw ApiError.badRequest('Invalid multiplier claim timing');
    }

    // Check if crashed
    if (claimed >= crashPoint) {
      // Vortex crashed before cashout completed
      let refund = 0;
      let newBalance = parseFloat(round.balanceAfter?.toString() || '0');

      // Check if Water Frost Shield was active
      if (elementalSurge?.element === 'WATER' && crashPoint >= elementalSurge.triggerMultiplier) {
        refund = activeBet;
        newBalance = await DemoWalletService.creditWin(round.demoWalletId, refund);
      }

      const updatedPublic = {
        ...publicState,
        activeBet: 0,
        outcome: 'CRASHED',
        crashPoint,
        shieldRefund: refund,
      };

      await prisma.demoGameRound.update({
        where: { id: roundId },
        data: {
          status: 'CRASHED',
          multiplier: crashPoint,
          publicState: JSON.stringify(updatedPublic),
          settledAt: new Date(),
        },
      });

      res.json({
        success: true,
        data: {
          outcome: 'CRASHED',
          crashPoint,
          payout: 0,
          refund,
          balanceAfter: newBalance,
          shieldActivated: refund > 0,
        },
      });
      return;
    }

    // Check Earth Bedrock Floor
    let effectiveMultiplier = claimed;
    if (elementalSurge?.element === 'EARTH' && claimed >= elementalSurge.triggerMultiplier) {
      effectiveMultiplier = Math.max(effectiveMultiplier, elementalSurge.floor || 1.5);
    }

    const cashoutFraction = isPartial ? Math.max(0.1, Math.min(0.9, parseFloat(fraction) || 0.5)) : 1.0;
    const betToCashout = +(activeBet * cashoutFraction).toFixed(2);
    const remainingBet = +(activeBet - betToCashout).toFixed(2);
    const payout = +(betToCashout * effectiveMultiplier).toFixed(2);

    const newBalance = await DemoWalletService.creditWin(round.demoWalletId, payout);
    const totalPayout = +(parseFloat(round.payout.toString()) + payout).toFixed(2);

    const partialRecord = {
      fraction: cashoutFraction,
      cashedBet: betToCashout,
      multiplier: effectiveMultiplier,
      payout,
      timestamp: Date.now(),
    };

    const updatedPublic = {
      ...publicState,
      activeBet: remainingBet,
      cashedOutPayout: totalPayout,
      partialCashouts: [...(publicState.partialCashouts || []), partialRecord],
    };

    const updatedSecret = {
      ...secret,
      activeBet: remainingBet,
      cashedOutPayout: totalPayout,
    };

    if (remainingBet <= 0) {
      // Full cashout complete -> Settle round as WON
      await prisma.demoGameRound.update({
        where: { id: roundId },
        data: {
          status: 'WON',
          payout: totalPayout,
          multiplier: effectiveMultiplier,
          balanceAfter: newBalance,
          publicState: JSON.stringify(updatedPublic),
          secretState: JSON.stringify(updatedSecret),
          settledAt: new Date(),
        },
      });

      res.json({
        success: true,
        data: {
          outcome: 'CASHOUT',
          isPartial: false,
          payout,
          totalPayout,
          remainingBet: 0,
          multiplier: effectiveMultiplier,
          balanceAfter: newBalance,
        },
      });
    } else {
      // Partial Cashout -> Keep round ACTIVE for remaining bet
      await prisma.demoGameRound.update({
        where: { id: roundId },
        data: {
          payout: totalPayout,
          multiplier: effectiveMultiplier,
          balanceAfter: newBalance,
          publicState: JSON.stringify(updatedPublic),
          secretState: JSON.stringify(updatedSecret),
        },
      });

      res.json({
        success: true,
        data: {
          outcome: 'PARTIAL_CASHOUT',
          isPartial: true,
          cashedBet: betToCashout,
          payout,
          totalPayout,
          remainingBet,
          multiplier: effectiveMultiplier,
          balanceAfter: newBalance,
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

export const crashTreasureVortex = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { roundId } = req.body;
    if (!roundId) {
      throw ApiError.badRequest('roundId is required');
    }

    const round = await prisma.demoGameRound.findUnique({
      where: { id: roundId },
    });

    if (!round) {
      throw ApiError.notFound('Round not found');
    }

    if (round.status !== 'ACTIVE') {
      res.json({
        success: true,
        data: {
          outcome: round.status,
          crashPoint: parseFloat(round.multiplier.toString()),
          balanceAfter: parseFloat(round.balanceAfter?.toString() || '0'),
        },
      });
      return;
    }

    const secret = JSON.parse(round.secretState || '{}');
    const publicState = JSON.parse(round.publicState || '{}');
    const { crashPoint, elementalSurge } = secret;
    const activeBet = parseFloat(secret.activeBet ?? round.betAmount.toString());

    let refund = 0;
    let newBalance = parseFloat(round.balanceAfter?.toString() || '0');

    // Water Frost Shield refund if active
    if (activeBet > 0 && elementalSurge?.element === 'WATER' && crashPoint >= elementalSurge.triggerMultiplier) {
      refund = activeBet;
      newBalance = await DemoWalletService.creditWin(round.demoWalletId, refund);
    }

    const updatedPublic = {
      ...publicState,
      activeBet: 0,
      outcome: 'CRASHED',
      crashPoint,
      shieldRefund: refund,
    };

    await prisma.demoGameRound.update({
      where: { id: roundId },
      data: {
        status: 'CRASHED',
        multiplier: crashPoint,
        balanceAfter: newBalance,
        publicState: JSON.stringify(updatedPublic),
        settledAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        outcome: 'CRASHED',
        crashPoint,
        refund,
        balanceAfter: newBalance,
        shieldActivated: refund > 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Backward-compatible Spin Handler
export interface VortexSymbol {
  id: number;
  name: string;
  icon: string;
  baseMultiplier: number;
  tier: 'LEGENDARY' | 'EPIC' | 'RARE' | 'COMMON';
  color: string;
}

export const VORTEX_SYMBOLS: VortexSymbol[] = [
  { id: 0, name: 'Treasure Crown', icon: '👑', baseMultiplier: 10.0, tier: 'LEGENDARY', color: '#fbbf24' },
  { id: 1, name: 'Diamond', icon: '💎', baseMultiplier: 5.0, tier: 'EPIC', color: '#38bdf8' },
  { id: 2, name: 'Golden Flame', icon: '🔥', baseMultiplier: 3.0, tier: 'EPIC', color: '#f97316' },
  { id: 3, name: 'Emerald Star', icon: '🌟', baseMultiplier: 2.5, tier: 'RARE', color: '#10b981' },
  { id: 4, name: 'Crystal Orb', icon: '🔮', baseMultiplier: 2.0, tier: 'RARE', color: '#c084fc' },
  { id: 5, name: 'Royal Key', icon: '🗝️', baseMultiplier: 1.5, tier: 'COMMON', color: '#a855f7' },
  { id: 6, name: 'Golden Coin', icon: '🪙', baseMultiplier: 1.2, tier: 'COMMON', color: '#eab308' },
  { id: 7, name: 'Ocean Wave', icon: '🌊', baseMultiplier: 0.5, tier: 'COMMON', color: '#06b6d4' },
];

export const RING_SECTORS: number[][] = [
  [0, 6, 3, 7, 2, 5, 1, 4],
  [2, 5, 0, 4, 7, 1, 6, 3],
  [1, 7, 4, 6, 0, 3, 5, 2],
  [3, 0, 5, 2, 6, 4, 7, 1],
];

export const RING_SECTOR_MULTIPLIERS: number[][] = [
  [52.0, 28.0, 12.0, 7.0, 3.0, 7.0, 12.0, 28.0],
  [20.0, 10.0, 5.0, 2.5, 5.0, 10.0, 20.0, 10.0],
  [11.0, 7.0, 3.0, 1.5, 3.0, 7.0, 11.0, 7.0],
  [10.0, 4.0, 2.0, 1.5, 2.0, 4.0, 10.0, 4.0],
];

export const spinTreasureVortex = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { betAmount = 50, demoToken } = req.body;
    const bet = parseFloat(betAmount);

    if (isNaN(bet) || bet < 10 || bet > 5000) {
      throw ApiError.badRequest('Bet amount must be between ₹10 and ₹5,000');
    }

    const wallet = await DemoWalletService.getOrCreateWallet(demoToken);
    const { balanceBefore, balanceAfter: balanceAfterBet } = await DemoWalletService.deductBet(wallet.id, bet);

    const ringTargets: number[] = [];
    for (let r = 0; r < 4; r++) {
      const randSector = Math.floor(secureRandomFloat() * 8);
      ringTargets.push(randSector);
    }

    const ringSymbols = ringTargets.map((sectorIdx, ringIdx) => {
      const symId = RING_SECTORS[ringIdx][sectorIdx];
      const mult = RING_SECTOR_MULTIPLIERS[ringIdx][sectorIdx];
      const symDef = VORTEX_SYMBOLS.find((s) => s.id === symId) || VORTEX_SYMBOLS[0];
      return {
        ...symDef,
        sectorMultiplier: mult,
      };
    });

    const counts: Record<number, number> = {};
    ringSymbols.forEach((s) => {
      counts[s.id] = (counts[s.id] || 0) + 1;
    });

    let maxMatchSymbolId = ringSymbols[0].id;
    let maxMatchCount = 1;
    for (const [symIdStr, cnt] of Object.entries(counts)) {
      if (cnt > maxMatchCount) {
        maxMatchCount = cnt;
        maxMatchSymbolId = parseInt(symIdStr, 10);
      }
    }

    const matchedSymDef = VORTEX_SYMBOLS.find((s) => s.id === maxMatchSymbolId)!;
    let comboMultiplier = 1.0;
    let convergenceLabel = 'DISPERSED VORTEX';

    if (maxMatchCount === 4) {
      comboMultiplier = 3.5;
      convergenceLabel = 'QUAD CONVERGENCE JACKPOT!';
    } else if (maxMatchCount === 3) {
      comboMultiplier = 2.0;
      convergenceLabel = 'TRIPLE VORTEX RESONANCE!';
    } else if (maxMatchCount === 2) {
      comboMultiplier = 1.2;
      convergenceLabel = 'DUAL VORTEX ALIGNMENT';
    }

    const avgBaseMult =
      ringSymbols.reduce((sum, s) => sum + s.sectorMultiplier, 0) / 4;

    let finalMultiplier = 0;
    if (maxMatchCount >= 2) {
      finalMultiplier = +(avgBaseMult * comboMultiplier).toFixed(2);
    } else {
      const rand = secureRandomFloat();
      if (rand < 0.4) {
        finalMultiplier = +(Math.max(0.5, avgBaseMult * 0.35)).toFixed(2);
      } else {
        finalMultiplier = 0;
      }
    }

    finalMultiplier = Math.min(52.0, finalMultiplier);
    const totalPayout = +(bet * finalMultiplier).toFixed(2);
    let finalBalance = balanceAfterBet;

    if (totalPayout > 0) {
      finalBalance = await DemoWalletService.creditWin(wallet.id, totalPayout);
    }

    const round = await prisma.demoGameRound.create({
      data: {
        demoWalletId: wallet.id,
        gameId: 'game-vortex-01',
        engine: 'VORTEX_4RING',
        status: totalPayout > 0 ? 'WON' : 'LOST',
        betAmount: bet,
        payout: totalPayout,
        multiplier: finalMultiplier,
        balanceBefore,
        balanceAfter: finalBalance,
        publicState: JSON.stringify({
          ringTargets,
          ringSymbolIds: ringSymbols.map((s) => s.id),
          landedMultipliers: ringSymbols.map((s) => s.sectorMultiplier),
          maxMatchCount,
          convergenceLabel,
          finalMultiplier,
        }),
        settledAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        roundId: round.id,
        ringTargets,
        ringSymbols: ringSymbols.map((s) => ({
          id: s.id,
          name: s.name,
          icon: s.icon,
          multiplier: s.sectorMultiplier,
          color: s.color,
        })),
        convergence: {
          matchCount: maxMatchCount,
          symbolName: matchedSymDef.name,
          symbolIcon: matchedSymDef.icon,
          comboMultiplier,
          label: convergenceLabel,
        },
        multiplier: finalMultiplier,
        totalPayout,
        isWin: totalPayout > 0,
        balanceBefore,
        balanceAfter: finalBalance,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTreasureVortexHistory = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rounds = await prisma.demoGameRound.findMany({
      where: { gameId: 'game-vortex-01' },
      orderBy: { startedAt: 'desc' },
      take: 10,
    });

    const history = rounds.map((r) => parseFloat(r.multiplier.toString()) || 0);
    const finalHistory =
      history.length > 0 ? history : [2.5, 0, 5.0, 0, 1.8, 10.0, 0, 3.5];

    res.json({ success: true, data: finalHistory });
  } catch (error) {
    next(error);
  }
};

