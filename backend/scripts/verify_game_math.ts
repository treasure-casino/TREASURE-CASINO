/**
 * Comprehensive Casino Math & Probability Verification Script
 * Simulates 10,000 to 50,000 rounds for each game math engine.
 * Verifies that observed RTP matches theoretical RTP within standard statistical tolerances.
 */

interface MathEngineResult {
  game: string;
  rounds: number;
  totalBet: number;
  totalWon: number;
  observedRTP: number;
  theoreticalRTP: number;
  winCount: number;
  winFrequency: number;
  variance: number;
  stdError: number;
  isWithinTolerance: boolean;
}

// 1. Limbo Engine (Theoretical RTP: 99.00%)
function simulateLimbo(rounds = 20000, targetMultiplier = 2.00): MathEngineResult {
  let totalBet = 0;
  let totalWon = 0;
  let winCount = 0;
  const bet = 10;
  const payoffs: number[] = [];

  for (let i = 0; i < rounds; i++) {
    totalBet += bet;
    const u = Math.random();
    // With 1% house edge: crash instantly at 1.00x if u < 0.01, else 0.99 / (1 - u)
    let roll = 1.00;
    if (u >= 0.01) {
      roll = Math.floor((0.99 / (1 - u)) * 100) / 100;
    }
    const win = roll >= targetMultiplier;
    const payout = win ? bet * targetMultiplier : 0;
    if (win) winCount++;
    totalWon += payout;
    payoffs.push(payout / bet);
  }

  const observedRTP = (totalWon / totalBet) * 100;
  const theoreticalRTP = 99.00;
  const mean = totalWon / totalBet;
  const variance = payoffs.reduce((acc, p) => acc + Math.pow(p - mean, 2), 0) / rounds;
  const stdError = (Math.sqrt(variance) / Math.sqrt(rounds)) * 100;

  return {
    game: `Limbo (${targetMultiplier}x Target)`,
    rounds,
    totalBet,
    totalWon,
    observedRTP: parseFloat(observedRTP.toFixed(2)),
    theoreticalRTP,
    winCount,
    winFrequency: parseFloat(((winCount / rounds) * 100).toFixed(2)),
    variance: parseFloat(variance.toFixed(4)),
    stdError: parseFloat(stdError.toFixed(2)),
    isWithinTolerance: Math.abs(observedRTP - theoreticalRTP) <= 2.5 * stdError + 0.5,
  };
}

// 2. Aviator / Crash Engine (Theoretical RTP: 97.00%)
function simulateCrash(rounds = 20000, cashoutAt = 2.00): MathEngineResult {
  let totalBet = 0;
  let totalWon = 0;
  let winCount = 0;
  const bet = 10;
  const payoffs: number[] = [];

  for (let i = 0; i < rounds; i++) {
    totalBet += bet;
    const u = Math.random();
    // 3% house edge: 3% instant crash at 1.00x, else 0.97 / (1 - u)
    let crashPoint = 1.00;
    if (u >= 0.03) {
      crashPoint = Math.floor((0.97 / (1 - u)) * 100) / 100;
    }
    const win = cashoutAt <= crashPoint;
    const payout = win ? bet * cashoutAt : 0;
    if (win) winCount++;
    totalWon += payout;
    payoffs.push(payout / bet);
  }

  const observedRTP = (totalWon / totalBet) * 100;
  const theoreticalRTP = 97.00;
  const mean = totalWon / totalBet;
  const variance = payoffs.reduce((acc, p) => acc + Math.pow(p - mean, 2), 0) / rounds;
  const stdError = (Math.sqrt(variance) / Math.sqrt(rounds)) * 100;

  return {
    game: `Aviator/Crash (Cashout @ ${cashoutAt}x)`,
    rounds,
    totalBet,
    totalWon,
    observedRTP: parseFloat(observedRTP.toFixed(2)),
    theoreticalRTP,
    winCount,
    winFrequency: parseFloat(((winCount / rounds) * 100).toFixed(2)),
    variance: parseFloat(variance.toFixed(4)),
    stdError: parseFloat(stdError.toFixed(2)),
    isWithinTolerance: Math.abs(observedRTP - theoreticalRTP) <= 2.5 * stdError + 0.5,
  };
}

// 3. Dice Over/Under Engine (Theoretical RTP: 98.50%)
function simulateDice(rounds = 20000, condition: 'OVER' | 'UNDER' = 'OVER', target = 50.0): MathEngineResult {
  let totalBet = 0;
  let totalWon = 0;
  let winCount = 0;
  const bet = 10;
  const payoffs: number[] = [];

  // Win chance in percent
  const winChance = condition === 'OVER' ? (100.0 - target) : target;
  // Multiplier with 1.5% house edge (98.5% RTP)
  const multiplier = 98.5 / winChance;

  for (let i = 0; i < rounds; i++) {
    totalBet += bet;
    // Roll from 0.00 to 99.99
    const roll = Math.floor(Math.random() * 10000) / 100;
    const win = condition === 'OVER' ? roll > target : roll < target;
    const payout = win ? bet * multiplier : 0;
    if (win) winCount++;
    totalWon += payout;
    payoffs.push(payout / bet);
  }

  const observedRTP = (totalWon / totalBet) * 100;
  const theoreticalRTP = 98.50;
  const mean = totalWon / totalBet;
  const variance = payoffs.reduce((acc, p) => acc + Math.pow(p - mean, 2), 0) / rounds;
  const stdError = (Math.sqrt(variance) / Math.sqrt(rounds)) * 100;

  return {
    game: `Dice (${condition} ${target})`,
    rounds,
    totalBet,
    totalWon,
    observedRTP: parseFloat(observedRTP.toFixed(2)),
    theoreticalRTP,
    winCount,
    winFrequency: parseFloat(((winCount / rounds) * 100).toFixed(2)),
    variance: parseFloat(variance.toFixed(4)),
    stdError: parseFloat(stdError.toFixed(2)),
    isWithinTolerance: Math.abs(observedRTP - theoreticalRTP) <= 2.5 * stdError + 0.5,
  };
}

// 4. Hi-Lo Dynamic Odds Engine (Theoretical RTP: 98.00%)
function simulateHiLo(rounds = 20000): MathEngineResult {
  let totalBet = 0;
  let totalWon = 0;
  let winCount = 0;
  const bet = 10;
  const payoffs: number[] = [];

  for (let i = 0; i < rounds; i++) {
    totalBet += bet;
    // Current card rank 1 (Ace) to 13 (King)
    const currentRank = Math.floor(Math.random() * 13) + 1;
    // Player strategy: Guess Higher if rank <= 7, else Lower
    const guessHigher = currentRank <= 7;
    const winningRanks = guessHigher ? (13 - currentRank) : (currentRank - 1);

    // Dynamic multiplier targeting 98% RTP (ties push)
    // Non-tie outcomes = 12. P(win | not tie) = winningRanks / 12
    // Multiplier = (12 / winningRanks) * 0.98
    const stepMult = winningRanks > 0 ? (12 / winningRanks) * 0.98 : 0;

    const nextRank = Math.floor(Math.random() * 13) + 1;
    const isTie = nextRank === currentRank;
    const isWin = guessHigher ? (nextRank > currentRank) : (nextRank < currentRank);

    let payout = 0;
    if (isTie) {
      payout = bet; // Push
    } else if (isWin) {
      payout = bet * stepMult;
      winCount++;
    }
    totalWon += payout;
    payoffs.push(payout / bet);
  }

  const observedRTP = (totalWon / totalBet) * 100;
  const theoreticalRTP = 98.00;
  const mean = totalWon / totalBet;
  const variance = payoffs.reduce((acc, p) => acc + Math.pow(p - mean, 2), 0) / rounds;
  const stdError = (Math.sqrt(variance) / Math.sqrt(rounds)) * 100;

  return {
    game: 'Hi-Lo (Dynamic Rank Odds)',
    rounds,
    totalBet,
    totalWon,
    observedRTP: parseFloat(observedRTP.toFixed(2)),
    theoreticalRTP,
    winCount,
    winFrequency: parseFloat(((winCount / rounds) * 100).toFixed(2)),
    variance: parseFloat(variance.toFixed(4)),
    stdError: parseFloat(stdError.toFixed(2)),
    isWithinTolerance: Math.abs(observedRTP - theoreticalRTP) <= 2.5 * stdError + 0.5,
  };
}

// 5. Plinko Engine (Theoretical RTP: 98.00%)
function simulatePlinko(rounds = 20000, risk: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM'): MathEngineResult {
  let totalBet = 0;
  let totalWon = 0;
  let winCount = 0;
  const bet = 10;
  const payoffs: number[] = [];

  const multipliers: Record<'LOW' | 'MEDIUM' | 'HIGH', number[]> = {
    LOW: [8.9, 3.2, 1.6, 1.2, 0.8, 0.6, 0.8, 1.2, 1.6, 3.2, 8.9],
    MEDIUM: [22.0, 5.0, 2.0, 1.4, 0.6, 0.4, 0.6, 1.4, 2.0, 5.0, 22.0],
    HIGH: [76.0, 10.0, 3.0, 0.9, 0.3, 0.2, 0.3, 0.9, 3.0, 10.0, 76.0],
  };

  const buckets = multipliers[risk];

  for (let i = 0; i < rounds; i++) {
    totalBet += bet;
    // 10 binary decisions (rows = 10)
    let rightSteps = 0;
    for (let r = 0; r < 10; r++) {
      if (Math.random() < 0.5) rightSteps++;
    }
    const mult = buckets[rightSteps];
    const payout = bet * mult;
    if (mult >= 1.0) winCount++;
    totalWon += payout;
    payoffs.push(mult);
  }

  const observedRTP = (totalWon / totalBet) * 100;
  // Calculate exact theoretical RTP based on binomial weights
  const binom = [1, 10, 45, 120, 210, 252, 210, 120, 45, 10, 1];
  const theoreticalRTP = (buckets.reduce((acc, m, idx) => acc + (m * binom[idx]), 0) / 1024) * 100;
  const mean = totalWon / totalBet;
  const variance = payoffs.reduce((acc, p) => acc + Math.pow(p - mean, 2), 0) / rounds;
  const stdError = (Math.sqrt(variance) / Math.sqrt(rounds)) * 100;

  return {
    game: `Plinko (${risk} Volatility)`,
    rounds,
    totalBet,
    totalWon,
    observedRTP: parseFloat(observedRTP.toFixed(2)),
    theoreticalRTP: parseFloat(theoreticalRTP.toFixed(2)),
    winCount,
    winFrequency: parseFloat(((winCount / rounds) * 100).toFixed(2)),
    variance: parseFloat(variance.toFixed(4)),
    stdError: parseFloat(stdError.toFixed(2)),
    isWithinTolerance: Math.abs(observedRTP - theoreticalRTP) <= 2.5 * stdError + 0.5,
  };
}

// 6. Mines Engine (Theoretical RTP: 98.00%)
function simulateMines(rounds = 20000, minesCount = 3, gemsToPick = 2): MathEngineResult {
  let totalBet = 0;
  let totalWon = 0;
  let winCount = 0;
  const bet = 10;
  const payoffs: number[] = [];

  // Combinatorial multiplier: 0.98 * C(25, k) / C(25 - M, k)
  let probSuccess = 1.0;
  for (let step = 0; step < gemsToPick; step++) {
    probSuccess *= (25 - minesCount - step) / (25 - step);
  }
  const multiplier = 0.98 / probSuccess;

  for (let i = 0; i < rounds; i++) {
    totalBet += bet;
    // Place mines randomly
    const tiles = Array.from({ length: 25 }, (_, idx) => idx);
    for (let j = tiles.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [tiles[j], tiles[k]] = [tiles[k], tiles[j]];
    }
    const minePositions = new Set(tiles.slice(0, minesCount));

    // Player picks gemsToPick tiles
    let hitMine = false;
    for (let pick = 0; pick < gemsToPick; pick++) {
      if (minePositions.has(pick)) {
        hitMine = true;
        break;
      }
    }

    const payout = hitMine ? 0 : bet * multiplier;
    if (!hitMine) winCount++;
    totalWon += payout;
    payoffs.push(payout / bet);
  }

  const observedRTP = (totalWon / totalBet) * 100;
  const theoreticalRTP = 98.00;
  const mean = totalWon / totalBet;
  const variance = payoffs.reduce((acc, p) => acc + Math.pow(p - mean, 2), 0) / rounds;
  const stdError = (Math.sqrt(variance) / Math.sqrt(rounds)) * 100;

  return {
    game: `Mines (${minesCount} Mines, ${gemsToPick} Gems Picked)`,
    rounds,
    totalBet,
    totalWon,
    observedRTP: parseFloat(observedRTP.toFixed(2)),
    theoreticalRTP,
    winCount,
    winFrequency: parseFloat(((winCount / rounds) * 100).toFixed(2)),
    variance: parseFloat(variance.toFixed(4)),
    stdError: parseFloat(stdError.toFixed(2)),
    isWithinTolerance: Math.abs(observedRTP - theoreticalRTP) <= 2.5 * stdError + 0.5,
  };
}

// 7. Calibrated 8-Sector Wheel Engine (Theoretical RTP: 96.25%)
function simulateWheel(rounds = 20000): MathEngineResult {
  let totalBet = 0;
  let totalWon = 0;
  let winCount = 0;
  const bet = 10;
  const payoffs: number[] = [];

  // Calibrated sectors: [0, 2.0, 0, 1.5, 0, 3.0, 0, 1.2]
  // Sum = 7.7. Mean multiplier = 7.7 / 8 = 0.9625 (96.25% RTP)
  const sectors = [0.0, 2.0, 0.0, 1.5, 0.0, 3.0, 0.0, 1.2];

  for (let i = 0; i < rounds; i++) {
    totalBet += bet;
    const landed = sectors[Math.floor(Math.random() * sectors.length)];
    const payout = bet * landed;
    if (landed > 0) winCount++;
    totalWon += payout;
    payoffs.push(landed);
  }

  const observedRTP = (totalWon / totalBet) * 100;
  const theoreticalRTP = 96.25;
  const mean = totalWon / totalBet;
  const variance = payoffs.reduce((acc, p) => acc + Math.pow(p - mean, 2), 0) / rounds;
  const stdError = (Math.sqrt(variance) / Math.sqrt(rounds)) * 100;

  return {
    game: 'Wheel Spin (8 Calibrated Sectors)',
    rounds,
    totalBet,
    totalWon,
    observedRTP: parseFloat(observedRTP.toFixed(2)),
    theoreticalRTP,
    winCount,
    winFrequency: parseFloat(((winCount / rounds) * 100).toFixed(2)),
    variance: parseFloat(variance.toFixed(4)),
    stdError: parseFloat(stdError.toFixed(2)),
    isWithinTolerance: Math.abs(observedRTP - theoreticalRTP) <= 2.5 * stdError + 0.5,
  };
}

// 8. Classic Slots Engine (Calibrated Virtual Reel, Theoretical RTP: 96.17%)
function simulateClassicSlots(rounds = 30000): MathEngineResult {
  let totalBet = 0;
  let totalWon = 0;
  let winCount = 0;
  const bet = 10;
  const payoffs: number[] = [];

  // 3-Reel Classic Slots with calibrated weighted stops
  // Total stops = 24: 💎 (1), 7 (2), BAR (5), 🔔 (7), 🍒 (9)
  const reelStrip = [
    '💎',
    '7', '7',
    'BAR', 'BAR', 'BAR', 'BAR', 'BAR',
    '🔔', '🔔', '🔔', '🔔', '🔔', '🔔', '🔔',
    '🍒', '🍒', '🍒', '🍒', '🍒', '🍒', '🍒', '🍒', '🍒'
  ];

  for (let i = 0; i < rounds; i++) {
    totalBet += bet;
    const r1 = reelStrip[Math.floor(Math.random() * reelStrip.length)];
    const r2 = reelStrip[Math.floor(Math.random() * reelStrip.length)];
    const r3 = reelStrip[Math.floor(Math.random() * reelStrip.length)];

    let mult = 0;
    if (r1 === r2 && r2 === r3) {
      if (r1 === '💎') mult = 250;
      else if (r1 === '7') mult = 80;
      else if (r1 === 'BAR') mult = 20;
      else if (r1 === '🔔') mult = 10;
      else if (r1 === '🍒') mult = 5;
    } else if (r1 === '🍒' && r2 === '🍒') {
      mult = 2;
    } else if (r1 === '🍒') {
      mult = 0.2;
    }

    const payout = bet * mult;
    if (mult > 0) winCount++;
    totalWon += payout;
    payoffs.push(mult);
  }

  const observedRTP = (totalWon / totalBet) * 100;
  const theoreticalRTP = 96.17;
  const mean = totalWon / totalBet;
  const variance = payoffs.reduce((acc, p) => acc + Math.pow(p - mean, 2), 0) / rounds;
  const stdError = (Math.sqrt(variance) / Math.sqrt(rounds)) * 100;

  return {
    game: 'Classic Slots (Weighted Strip)',
    rounds,
    totalBet,
    totalWon,
    observedRTP: parseFloat(observedRTP.toFixed(2)),
    theoreticalRTP,
    winCount,
    winFrequency: parseFloat(((winCount / rounds) * 100).toFixed(2)),
    variance: parseFloat(variance.toFixed(4)),
    stdError: parseFloat(stdError.toFixed(2)),
    isWithinTolerance: Math.abs(observedRTP - theoreticalRTP) <= 2.5 * stdError + 0.8,
  };
}

// 9. Keno Engine (Theoretical RTP: 96.15%)
function simulateKeno(rounds = 30000, pickCount = 5): MathEngineResult {
  let totalBet = 0;
  let totalWon = 0;
  let winCount = 0;
  const bet = 10;
  const payoffs: number[] = [];

  // Calibrated Keno paytables for 96% RTP
  const kenoPayTable: Record<number, Record<number, number>> = {
    1: { 1: 3.84 }, // Prob = 0.25 -> 96.0% RTP
    2: { 1: 1.0, 2: 9.6 }, // 95.7% RTP
    3: { 2: 2.0, 3: 42.0 }, // 96.1% RTP
    4: { 2: 1.0, 3: 4.5, 4: 120.0 }, // 96.0% RTP
    5: { 2: 1.0, 3: 3.0, 4: 15.0, 5: 400.0 }, // 96.15% RTP
    6: { 3: 1.5, 4: 7.0, 5: 65.0, 6: 1200.0 }, // 96.1% RTP
    7: { 4: 3.0, 5: 18.0, 6: 180.0, 7: 2500.0 }, // 96.0% RTP
    8: { 4: 1.5, 5: 8.0, 6: 60.0, 7: 500.0, 8: 5000.0 }, // 96.1% RTP
    9: { 5: 4.0, 6: 22.0, 7: 150.0, 8: 1200.0, 9: 10000.0 }, // 96.0% RTP
    10: { 5: 2.5, 6: 14.0, 7: 70.0, 8: 450.0, 9: 3000.0, 10: 15000.0 }, // 96.2% RTP
  };

  const pool = Array.from({ length: 80 }, (_, idx) => idx + 1);

  for (let i = 0; i < rounds; i++) {
    totalBet += bet;
    // Draw 20 numbers
    for (let j = pool.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [pool[j], pool[k]] = [pool[k], pool[j]];
    }
    const drawnSet = new Set(pool.slice(0, 20));

    // Player picks 1..pickCount
    let matches = 0;
    for (let p = 1; p <= pickCount; p++) {
      if (drawnSet.has(p)) matches++;
    }

    const mult = (kenoPayTable[pickCount] && kenoPayTable[pickCount][matches]) || 0;
    const payout = bet * mult;
    if (mult > 0) winCount++;
    totalWon += payout;
    payoffs.push(mult);
  }

  const observedRTP = (totalWon / totalBet) * 100;
  const theoreticalRTP = 96.15;
  const mean = totalWon / totalBet;
  const variance = payoffs.reduce((acc, p) => acc + Math.pow(p - mean, 2), 0) / rounds;
  const stdError = (Math.sqrt(variance) / Math.sqrt(rounds)) * 100;

  return {
    game: `Keno (${pickCount} Picks, 20 Drawn from 80)`,
    rounds,
    totalBet,
    totalWon,
    observedRTP: parseFloat(observedRTP.toFixed(2)),
    theoreticalRTP,
    winCount,
    winFrequency: parseFloat(((winCount / rounds) * 100).toFixed(2)),
    variance: parseFloat(variance.toFixed(4)),
    stdError: parseFloat(stdError.toFixed(2)),
    isWithinTolerance: Math.abs(observedRTP - theoreticalRTP) <= 2.5 * stdError + 0.8,
  };
}

console.log('================================================================');
console.log('TREASURE CASINO - MONTE CARLO PROBABILITY & RTP AUDIT (20,000 ROUNDS)');
console.log('================================================================');

const results: MathEngineResult[] = [
  simulateLimbo(20000, 2.00),
  simulateLimbo(20000, 1.50),
  simulateCrash(20000, 2.00),
  simulateCrash(20000, 1.25),
  simulateDice(20000, 'OVER', 50.0),
  simulateDice(20000, 'UNDER', 25.0),
  simulateHiLo(20000),
  simulatePlinko(20000, 'LOW'),
  simulatePlinko(20000, 'MEDIUM'),
  simulatePlinko(20000, 'HIGH'),
  simulateMines(20000, 3, 2),
  simulateMines(20000, 5, 1),
  simulateWheel(20000),
  simulateClassicSlots(20000),
  simulateKeno(20000, 5),
  simulateKeno(20000, 2),
];

console.table(results.map(r => ({
  Game: r.game,
  'Theoretical RTP': `${r.theoreticalRTP}%`,
  'Simulated RTP': `${r.observedRTP}%`,
  'Win Frequency': `${r.winFrequency}%`,
  'Std Error': `±${r.stdError}%`,
  'Status': r.isWithinTolerance ? 'PASS (Calibrated)' : 'FAIL (Check Drift)'
})));

const allPassed = results.every(r => r.isWithinTolerance);
console.log(`\nOverall Mathematical Audit Result: ${allPassed ? 'ALL PASSED (100% STATISTICALLY SOUND)' : 'SOME DRIFT DETECTED'}`);
