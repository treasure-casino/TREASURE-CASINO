import {
  createSpiralState,
  calculateSpiralState,
  applySpinTurn,
  generateSymbol,
  halfCashOutSpiral,
  fullCashOutSpiral,
  calculateMultipliers,
  INNER_MULTIPLIERS,
  MIDDLE_MULTIPLIERS,
  OUTER_MULTIPLIERS,
  SpiralSymbol,
} from '../spiralEngine';

describe('SpiralEngine Authoritative Multiplier Engine Tests', () => {
  describe('Exact Multiplier Tables (Section 2)', () => {
    it('verifies exact configured values across all 3 rings', () => {
      // OUTER: Index 0=3.9x, 1=12.5x, 2=28x, 3=52x, 4=85x, 5=133x, 6=200x, 7=BONUS 700x
      expect(OUTER_MULTIPLIERS).toEqual([3.9, 12.5, 28, 52, 85, 133, 200, 700]);

      // MIDDLE: Index 0=2.5x, 1=7.7x, 2=16x, 3=27x, 4=44x, 5=BONUS +20.5x
      expect(MIDDLE_MULTIPLIERS).toEqual([2.5, 7.7, 16, 27, 44, 20.5]);

      // INNER: Index 0=1.55x, 1=4.85x, 2=10x, 3=BONUS +7x
      expect(INNER_MULTIPLIERS).toEqual([1.55, 4.85, 10, 7]);
    });
  });

  describe('Section 7 — Automated Deterministic Sequence Tests (A through J)', () => {
    it('A. Start: Outer=null, Middle=null, Inner=null, Total=0.00x', () => {
      const state = createSpiralState(100);
      expect(state.hasStarted).toBe(false);
      expect(state.outerIndex).toBeNull();
      expect(state.middleIndex).toBeNull();
      expect(state.innerIndex).toBeNull();
      expect(state.outerMultiplier).toBe(0.0);
      expect(state.middleMultiplier).toBe(0.0);
      expect(state.innerMultiplier).toBe(0.0);
      expect(state.totalMultiplier).toBe(0.0);
      expect(state.potentialPayout).toBe(0);
    });

    it('B. Lion: Outer=0 (3.9x), Middle=null, Inner=null, Total=3.9x', () => {
      let state = createSpiralState(100);
      state = applySpinTurn(state, 'LION');
      expect(state.outerIndex).toBe(0);
      expect(state.outerMultiplier).toBe(3.9);
      expect(state.middleIndex).toBeNull();
      expect(state.innerIndex).toBeNull();
      expect(state.totalMultiplier).toBe(3.9);
      expect(state.potentialPayout).toBe(390);
    });

    it('C. Lion + Lion: Outer=1 (12.5x), Total=12.5x', () => {
      let state = createSpiralState(100);
      state = applySpinTurn(state, 'LION');
      state = applySpinTurn(state, 'LION');
      expect(state.outerIndex).toBe(1);
      expect(state.outerMultiplier).toBe(12.5);
      expect(state.middleIndex).toBeNull();
      expect(state.innerIndex).toBeNull();
      expect(state.totalMultiplier).toBe(12.5);
      expect(state.potentialPayout).toBe(1250);
    });

    it('D. Dog + Dog: Inner=1 (4.85x), Total=4.85x', () => {
      let state = createSpiralState(100);
      state = applySpinTurn(state, 'DOG');
      state = applySpinTurn(state, 'DOG');
      expect(state.innerIndex).toBe(1);
      expect(state.innerMultiplier).toBe(4.85);
      expect(state.outerIndex).toBeNull();
      expect(state.middleIndex).toBeNull();
      expect(state.totalMultiplier).toBe(4.85);
      expect(state.potentialPayout).toBe(485);
    });

    it('E. Dog + Dog + Skull: Inner=0 (1.55x), NOT 0x', () => {
      let state = createSpiralState(100);
      state = applySpinTurn(state, 'DOG'); // Index 0 (1.55x)
      state = applySpinTurn(state, 'DOG'); // Index 1 (4.85x)
      state = applySpinTurn(state, 'SKULL'); // Moves backward to Index 0
      expect(state.innerIndex).toBe(0);
      expect(state.innerMultiplier).toBe(1.55);
      expect(state.outerIndex).toBeNull();
      expect(state.middleIndex).toBeNull();
      expect(state.totalMultiplier).toBe(1.55); // NOT 0x!
      expect(state.potentialPayout).toBe(155);
    });

    it('F. Lion + Elephant + Dog: Outer=3.9x, Middle=2.5x, Inner=1.55x, Total=7.95x', () => {
      let state = createSpiralState(100);
      state = applySpinTurn(state, 'LION');
      state = applySpinTurn(state, 'ELEPHANT');
      state = applySpinTurn(state, 'DOG');

      expect(state.outerIndex).toBe(0);
      expect(state.middleIndex).toBe(0);
      expect(state.innerIndex).toBe(0);
      expect(state.outerMultiplier).toBe(3.9);
      expect(state.middleMultiplier).toBe(2.5);
      expect(state.innerMultiplier).toBe(1.55);
      expect(state.totalMultiplier).toBe(7.95); // 3.9 + 2.5 + 1.55 = 7.95x
      expect(state.potentialPayout).toBe(795);
    });

    it('G. Lion + Elephant + Dog + Skull: each decreases by exactly 1 index, Total recalculated', () => {
      let state = createSpiralState(100);
      state = applySpinTurn(state, 'LION'); // Outer=0
      state = applySpinTurn(state, 'ELEPHANT'); // Middle=0
      state = applySpinTurn(state, 'DOG'); // Inner=0
      expect(state.totalMultiplier).toBe(7.95);

      state = applySpinTurn(state, 'SKULL');
      // All 3 were at Index 0. Decrementing by 1 applies boundary: moves to null.
      expect(state.outerIndex).toBeNull();
      expect(state.middleIndex).toBeNull();
      expect(state.innerIndex).toBeNull();
      expect(state.totalMultiplier).toBe(0.0);
      expect(state.potentialPayout).toBe(0);
    });

    it('H. Any sequence + Goat: absolutely no state changes', () => {
      let state = createSpiralState(100);
      state = applySpinTurn(state, 'LION');
      state = applySpinTurn(state, 'DOG');
      const expectedTotal = 5.45; // 3.9 + 1.55
      expect(state.totalMultiplier).toBe(expectedTotal);

      const before = { ...state };
      state = applySpinTurn(state, 'GOAT');

      expect(state.outerIndex).toBe(before.outerIndex);
      expect(state.middleIndex).toBe(before.middleIndex);
      expect(state.innerIndex).toBe(before.innerIndex);
      expect(state.outerMultiplier).toBe(before.outerMultiplier);
      expect(state.middleMultiplier).toBe(before.middleMultiplier);
      expect(state.innerMultiplier).toBe(before.innerMultiplier);
      expect(state.totalMultiplier).toBe(before.totalMultiplier);
      expect(state.accumulatedBonus).toBe(before.accumulatedBonus);
      expect(state.potentialPayout).toBe(before.potentialPayout);
    });

    it('I. Skull when all circles are inactive: all remain inactive; no negative index', () => {
      let state = createSpiralState(100);
      state = applySpinTurn(state, 'SKULL');
      expect(state.outerIndex).toBeNull();
      expect(state.middleIndex).toBeNull();
      expect(state.innerIndex).toBeNull();
      expect(state.totalMultiplier).toBe(0.0);
      expect(state.potentialPayout).toBe(0);
    });

    it('J. Test all bonus boundaries and ensure no duplicate bonus', () => {
      // 1. Inner Circle Bonus (+7x)
      let state = createSpiralState(100);
      state = applySpinTurn(state, 'DOG'); // Index 0 (1.55x)
      state = applySpinTurn(state, 'DOG'); // Index 1 (4.85x)
      state = applySpinTurn(state, 'DOG'); // Index 2 (10x)
      expect(state.innerIndex).toBe(2);
      expect(state.accumulatedBonus).toBe(0);

      // 4th Dog triggers Inner bonus (+7x) and steps back to index 2 (10x)
      state = applySpinTurn(state, 'DOG');
      expect(state.innerIndex).toBe(2);
      expect(state.innerBonusAwarded).toBe(true);
      expect(state.accumulatedBonus).toBe(7);
      expect(state.totalMultiplier).toBe(17.0); // 10x + 7x = 17x
      expect(state.lastBonus?.type).toBe('INNER_BONUS');

      // 5th Dog: NO DUPLICATE BONUS! Capped at index 2 (10x), bonus remains 7x
      state = applySpinTurn(state, 'DOG');
      expect(state.innerIndex).toBe(2);
      expect(state.accumulatedBonus).toBe(7);
      expect(state.totalMultiplier).toBe(17.0); // No duplicate bonus!

      // Skull steps back to index 1 (4.85x), bonus preserved
      state = applySpinTurn(state, 'SKULL');
      expect(state.innerIndex).toBe(1);
      expect(state.accumulatedBonus).toBe(7);
      expect(state.totalMultiplier).toBe(11.85); // 4.85 + 7 = 11.85x

      // 2. Middle Circle Bonus (+20.5x)
      let midState = createSpiralState(100);
      for (let i = 0; i < 5; i++) {
        midState = applySpinTurn(midState, 'ELEPHANT'); // reaches Index 4 (44x)
      }
      expect(midState.middleIndex).toBe(4);
      expect(midState.accumulatedBonus).toBe(0);

      // 6th Elephant triggers Middle bonus (+20.5x) and steps back to index 4 (44x)
      midState = applySpinTurn(midState, 'ELEPHANT');
      expect(midState.middleIndex).toBe(4);
      expect(midState.middleBonusAwarded).toBe(true);
      expect(midState.accumulatedBonus).toBe(20.5);
      expect(midState.totalMultiplier).toBe(64.5); // 44 + 20.5 = 64.5x

      // 7th Elephant: NO DUPLICATE BONUS! Capped at index 4 (44x)
      midState = applySpinTurn(midState, 'ELEPHANT');
      expect(midState.middleIndex).toBe(4);
      expect(midState.accumulatedBonus).toBe(20.5);
      expect(midState.totalMultiplier).toBe(64.5);

      // 3. Outer Circle Bonus (+700x)
      let outState = createSpiralState(100);
      for (let i = 0; i < 7; i++) {
        outState = applySpinTurn(outState, 'LION'); // reaches Index 6 (200x)
      }
      expect(outState.outerIndex).toBe(6);
      expect(outState.accumulatedBonus).toBe(0);

      // 8th Lion triggers Outer bonus (+700x) and steps back to index 6 (200x)
      outState = applySpinTurn(outState, 'LION');
      expect(outState.outerIndex).toBe(6);
      expect(outState.outerBonusAwarded).toBe(true);
      expect(outState.accumulatedBonus).toBe(700);
      expect(outState.totalMultiplier).toBe(900.0); // 200 + 700 = 900x

      // 9th Lion: NO DUPLICATE BONUS! Capped at index 6 (200x)
      outState = applySpinTurn(outState, 'LION');
      expect(outState.outerIndex).toBe(6);
      expect(outState.accumulatedBonus).toBe(700);
      expect(outState.totalMultiplier).toBe(900.0);
    });
  });

  describe('User Example Calculations', () => {
    it('Lion twice + Dog twice = 12.5 + 4.85 = 17.35x', () => {
      let state = createSpiralState(100);
      state = applySpinTurn(state, 'LION'); // 3.9
      state = applySpinTurn(state, 'LION'); // 12.5
      state = applySpinTurn(state, 'DOG'); // 1.55
      state = applySpinTurn(state, 'DOG'); // 4.85
      expect(state.outerIndex).toBe(1);
      expect(state.innerIndex).toBe(1);
      expect(state.totalMultiplier).toBe(17.35); // 12.5 + 4.85
      expect(state.potentialPayout).toBe(1735);
    });

    it('Lion twice + Dog twice + Skull = 3.9 + 1.55 = 5.45x', () => {
      let state = createSpiralState(100);
      state = applySpinTurn(state, 'LION'); // 3.9
      state = applySpinTurn(state, 'LION'); // 12.5
      state = applySpinTurn(state, 'DOG'); // 1.55
      state = applySpinTurn(state, 'DOG'); // 4.85
      expect(state.totalMultiplier).toBe(17.35);

      state = applySpinTurn(state, 'SKULL');
      // Outer decreases from 1 to 0 (3.9x)
      // Inner decreases from 1 to 0 (1.55x)
      expect(state.outerIndex).toBe(0);
      expect(state.innerIndex).toBe(0);
      expect(state.totalMultiplier).toBe(5.45); // 3.9 + 1.55
      expect(state.potentialPayout).toBe(545);
    });
  });

  describe('Cashout & Half Cashout Mechanics', () => {
    it('handles half cashout and full cashout cleanly', () => {
      let state = createSpiralState(100);
      state = applySpinTurn(state, 'LION'); // 3.9x -> potential 390
      expect(state.totalMultiplier).toBe(3.9);

      const { state: halfState, creditedAmount } = halfCashOutSpiral(state);
      expect(creditedAmount).toBe(195);
      expect(halfState.halfCashedOut).toBe(true);

      const { state: finalState, finalPayout, totalPayout } = fullCashOutSpiral(halfState);
      expect(finalPayout).toBe(195);
      expect(totalPayout).toBe(390);
      expect(finalState.active).toBe(false);
    });
  });
});
