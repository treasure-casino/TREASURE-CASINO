const path = require('path');
const {
  createSpiralState,
  applySpinTurn,
  generateSymbol,
  halfCashOutSpiral,
  fullCashOutSpiral,
  INNER_MULTIPLIERS,
  MIDDLE_MULTIPLIERS,
  OUTER_MULTIPLIERS,
} = require('../backend/dist/games/spiral/spiralEngine');

// Disable verbose console logs during batch simulation, keep only high-level summary
process.env.DEBUG_SPIRAL = 'false';

async function run1000RoundsSimulation() {
  console.log('================================================================');
  console.log('🧪 SIMULATING 1,000 COMPLETE ROUNDS OF TREASURE SPIRAL');
  console.log('   Strict Invariant Checking Across All State Transitions');
  console.log('================================================================\n');

  const TOTAL_ROUNDS = 1000;
  let totalSpins = 0;
  let totalCashouts = 0;
  let totalHalfCashouts = 0;
  let totalBonusesAwarded = 0;
  let skullResets = 0;
  let goatNoOps = 0;

  const symbolCounts = {
    LION: 0,
    ELEPHANT: 0,
    DOG: 0,
    GOAT: 0,
    SKULL: 0,
  };

  const startTime = Date.now();

  for (let r = 1; r <= TOTAL_ROUNDS; r++) {
    const betAmount = 100;
    let state = createSpiralState(betAmount);

    // Invariant 1: Initial state before first spin
    if (
      state.hasStarted !== false ||
      state.innerPosition !== null ||
      state.middlePosition !== null ||
      state.outerPosition !== null ||
      state.totalMultiplier !== 0 ||
      state.potentialPayout !== 0 ||
      state.innerMultiplier !== 0 ||
      state.middleMultiplier !== 0 ||
      state.outerMultiplier !== 0 ||
      state.accumulatedBonus !== 0
    ) {
      throw new Error(`Round ${r}: Initial state violated! Received: ${JSON.stringify(state)}`);
    }

    // Number of spins in this round (between 5 and 30 spins, or until cashout)
    const maxSpins = 5 + Math.floor(Math.random() * 25);
    let halfCashedOutInRound = false;

    for (let s = 1; s <= maxSpins; s++) {
      totalSpins++;
      const symbol = generateSymbol();
      symbolCounts[symbol]++;

      const prevInner = state.innerPosition;
      const prevMiddle = state.middlePosition;
      const prevOuter = state.outerPosition;
      const prevMult = state.totalMultiplier;
      const prevBonus = state.accumulatedBonus;
      const prevStarted = state.hasStarted;

      // Apply spin turn
      state = applySpinTurn(state, symbol, betAmount);

      // Invariant 2: Lion changes ONLY Outer Circle
      if (symbol === 'LION') {
        if (state.innerPosition !== prevInner || state.middlePosition !== prevMiddle) {
          throw new Error(`Round ${r}, Spin ${s}: LION changed Inner/Middle! Inner: ${state.innerPosition}, Middle: ${state.middlePosition}`);
        }
        if (prevOuter === null) {
          if (state.outerPosition !== 0) throw new Error(`Round ${r}, Spin ${s}: First LION did not start Outer at 0!`);
        } else if (prevOuter < 7) {
          // If stepped from 6 to 7, it triggers bonus and steps back to 6
          if (prevOuter === 6) {
            if (state.outerPosition !== 6) throw new Error(`Round ${r}, Spin ${s}: Outer 7 bonus did not step back to 6!`);
            totalBonusesAwarded++;
          } else {
            if (state.outerPosition !== prevOuter + 1) throw new Error(`Round ${r}, Spin ${s}: LION did not increment Outer!`);
          }
        }
      }

      // Invariant 3: Elephant changes ONLY Middle Circle
      if (symbol === 'ELEPHANT') {
        if (state.innerPosition !== prevInner || state.outerPosition !== prevOuter) {
          throw new Error(`Round ${r}, Spin ${s}: ELEPHANT changed Inner/Outer!`);
        }
        if (prevMiddle === null) {
          if (state.middlePosition !== 0) throw new Error(`Round ${r}, Spin ${s}: First ELEPHANT did not start Middle at 0!`);
        } else if (prevMiddle < 5) {
          if (prevMiddle === 4) {
            if (state.middlePosition !== 4) throw new Error(`Round ${r}, Spin ${s}: Middle 5 bonus did not step back to 4!`);
            totalBonusesAwarded++;
          } else {
            if (state.middlePosition !== prevMiddle + 1) throw new Error(`Round ${r}, Spin ${s}: ELEPHANT did not increment Middle!`);
          }
        }
      }

      // Invariant 4: Dog changes ONLY Inner Circle
      if (symbol === 'DOG') {
        if (state.middlePosition !== prevMiddle || state.outerPosition !== prevOuter) {
          throw new Error(`Round ${r}, Spin ${s}: DOG changed Middle/Outer!`);
        }
        if (prevInner === null) {
          if (state.innerPosition !== 0) throw new Error(`Round ${r}, Spin ${s}: First DOG did not start Inner at 0!`);
        } else if (prevInner < 3) {
          if (prevInner === 2) {
            if (state.innerPosition !== 2) throw new Error(`Round ${r}, Spin ${s}: Inner 3 bonus did not step back to 2!`);
            totalBonusesAwarded++;
          } else {
            if (state.innerPosition !== prevInner + 1) throw new Error(`Round ${r}, Spin ${s}: DOG did not increment Inner!`);
          }
        }
      }

      // Invariant 5: Goat changes NOTHING
      if (symbol === 'GOAT') {
        goatNoOps++;
        if (
          state.innerPosition !== prevInner ||
          state.middlePosition !== prevMiddle ||
          state.outerPosition !== prevOuter ||
          state.totalMultiplier !== prevMult ||
          state.accumulatedBonus !== prevBonus ||
          state.hasStarted !== prevStarted
        ) {
          throw new Error(`Round ${r}, Spin ${s}: GOAT modified state!`);
        }
      }

      // Invariant 6: Skull reverses progression
      if (symbol === 'SKULL') {
        // Check exact decrement behavior: if was > 0, should be prev - 1; if was 0, should be null; if was null, stays null
        if (prevInner !== null && prevInner > 0 && state.innerPosition !== prevInner - 1) {
          throw new Error(`Round ${r}, Spin ${s}: Inner failed to decrement by 1 on SKULL!`);
        }
        if (prevInner === 0 && state.innerPosition !== null) {
          throw new Error(`Round ${r}, Spin ${s}: Inner 0 did not return to null on SKULL!`);
        }
        if (prevMiddle !== null && prevMiddle > 0 && state.middlePosition !== prevMiddle - 1) {
          throw new Error(`Round ${r}, Spin ${s}: Middle failed to decrement by 1 on SKULL!`);
        }
        if (prevMiddle === 0 && state.middlePosition !== null) {
          throw new Error(`Round ${r}, Spin ${s}: Middle 0 did not return to null on SKULL!`);
        }
        if (prevOuter !== null && prevOuter > 0 && state.outerPosition !== prevOuter - 1) {
          throw new Error(`Round ${r}, Spin ${s}: Outer failed to decrement by 1 on SKULL!`);
        }
        if (prevOuter === 0 && state.outerPosition !== null) {
          throw new Error(`Round ${r}, Spin ${s}: Outer 0 did not return to null on SKULL!`);
        }

        // Multiplier verification on Skull
        const activeMults = [state.outerMultiplier, state.middleMultiplier, state.innerMultiplier].filter(m => m > 0);
        if (activeMults.length === 0) {
          if (state.totalMultiplier !== (state.accumulatedBonus > 0 ? state.accumulatedBonus : 0)) {
            throw new Error(`Round ${r}, Spin ${s}: SKULL all neutral did not reset totalMultiplier! Got: ${state.totalMultiplier}`);
          }
          skullResets++;
        } else {
          const expected = +(Math.max(...activeMults) + state.accumulatedBonus).toFixed(2);
          if (state.totalMultiplier !== expected) {
            throw new Error(`Round ${r}, Spin ${s}: SKULL expected ${expected}x, got ${state.totalMultiplier}x`);
          }
        }
      }

      // Invariant 7: Section Index Boundaries (0-based)
      if (state.innerPosition !== null && (state.innerPosition < 0 || state.innerPosition > 3)) {
        throw new Error(`Round ${r}, Spin ${s}: Invalid Inner Section Index: ${state.innerPosition}`);
      }
      if (state.middlePosition !== null && (state.middlePosition < 0 || state.middlePosition > 5)) {
        throw new Error(`Round ${r}, Spin ${s}: Invalid Middle Section Index: ${state.middlePosition}`);
      }
      if (state.outerPosition !== null && (state.outerPosition < 0 || state.outerPosition > 7)) {
        throw new Error(`Round ${r}, Spin ${s}: Invalid Outer Section Index: ${state.outerPosition}`);
      }

      // Invariant 8 & 9: Total Multiplier Consistency
      if (!state.hasStarted) {
        if (state.totalMultiplier !== 0) throw new Error(`Round ${r}, Spin ${s}: unstarted round has multiplier > 0`);
      } else if (symbol !== 'GOAT') {
        const expectedInner = state.innerPosition !== null ? INNER_MULTIPLIERS[state.innerPosition] : 0;
        const expectedMiddle = state.middlePosition !== null ? MIDDLE_MULTIPLIERS[state.middlePosition] : 0;
        const expectedOuter = state.outerPosition !== null ? OUTER_MULTIPLIERS[state.outerPosition] : 0;
        let expectedTotal = 0;
        if (symbol === 'LION') {
          expectedTotal = +(expectedOuter + state.accumulatedBonus).toFixed(2);
        } else if (symbol === 'ELEPHANT') {
          expectedTotal = +(expectedMiddle + state.accumulatedBonus).toFixed(2);
        } else if (symbol === 'DOG') {
          expectedTotal = +(expectedInner + state.accumulatedBonus).toFixed(2);
        } else if (symbol === 'SKULL') {
          const activeM = [expectedOuter, expectedMiddle, expectedInner].filter(m => m > 0);
          expectedTotal = activeM.length > 0 ? +(Math.max(...activeM) + state.accumulatedBonus).toFixed(2) : (state.accumulatedBonus > 0 ? state.accumulatedBonus : 0);
        }
        if (Math.abs(state.totalMultiplier - expectedTotal) > 0.001) {
          throw new Error(`Round ${r}, Spin ${s}: Multiplier calculation mismatch for ${symbol}! Expected: ${expectedTotal}, Got: ${state.totalMultiplier}`);
        }
      }

      // Invariant 10: Potential Payout
      const expectedPayout = Math.round(betAmount * state.totalMultiplier);
      if (state.potentialPayout !== expectedPayout) {
        throw new Error(`Round ${r}, Spin ${s}: Potential payout mismatch! Expected: ${expectedPayout}, Got: ${state.potentialPayout}`);
      }

      // Random Half Cashout Test
      if (!halfCashedOutInRound && state.totalMultiplier > 5.0 && Math.random() < 0.25) {
        const { state: halfState, creditedAmount } = halfCashOutSpiral(state);
        halfCashedOutInRound = true;
        totalHalfCashouts++;
        if (creditedAmount !== Math.floor(expectedPayout * 0.5)) {
          throw new Error(`Round ${r}, Spin ${s}: Half cashout credited wrong amount!`);
        }
        if (halfState.status !== 'HALF_WON') {
          throw new Error(`Round ${r}, Spin ${s}: Half cashout status not HALF_WON!`);
        }
        state = halfState;
      }

      // Random Full Cashout Test
      if (state.totalMultiplier > 10.0 && Math.random() < 0.2) {
        const { state: finalState, finalPayout, totalPayout } = fullCashOutSpiral(state);
        totalCashouts++;
        if (finalState.active !== false || finalState.status !== 'WON') {
          throw new Error(`Round ${r}, Spin ${s}: Cashout status incorrect!`);
        }
        const expectedFinal = halfCashedOutInRound
          ? Math.floor(expectedPayout * 0.5)
          : expectedPayout;
        if (finalPayout !== expectedFinal) {
          throw new Error(`Round ${r}, Spin ${s}: Final payout mismatch!`);
        }
        break; // End round
      }
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('✅ SIMULATION COMPLETE: All 1,000 Rounds (and all spin transitions) passed 100%!');
  console.log('────────────────────────────────────────────────────────────────');
  console.log(`  Total Rounds Simulated   : ${TOTAL_ROUNDS.toLocaleString()}`);
  console.log(`  Total Spin Transitions   : ${totalSpins.toLocaleString()}`);
  console.log(`  GOAT No-Op Invariants    : ${goatNoOps.toLocaleString()}`);
  console.log(`  Skull Hazard Resets (0x) : ${skullResets.toLocaleString()}`);
  console.log(`  Bonuses Awarded          : ${totalBonusesAwarded.toLocaleString()}`);
  console.log(`  Half Cashouts Executed   : ${totalHalfCashouts.toLocaleString()}`);
  console.log(`  Full Cashouts Executed   : ${totalCashouts.toLocaleString()}`);
  console.log(`  Simulation Duration      : ${duration}s`);
  console.log('────────────────────────────────────────────────────────────────');
  console.log('  Symbol Distribution:');
  console.log(`    LION     : ${((symbolCounts.LION / totalSpins) * 100).toFixed(2)}% (Target: ~12%)`);
  console.log(`    ELEPHANT : ${((symbolCounts.ELEPHANT / totalSpins) * 100).toFixed(2)}% (Target: ~12%)`);
  console.log(`    DOG      : ${((symbolCounts.DOG / totalSpins) * 100).toFixed(2)}% (Target: ~11%)`);
  console.log(`    GOAT     : ${((symbolCounts.GOAT / totalSpins) * 100).toFixed(2)}% (Target: ~33%)`);
  console.log(`    SKULL    : ${((symbolCounts.SKULL / totalSpins) * 100).toFixed(2)}% (Target: ~32%)`);
  console.log('================================================================\n');
}

run1000RoundsSimulation().catch((err) => {
  console.error('❌ SIMULATION FAILED:', err);
  process.exit(1);
});

