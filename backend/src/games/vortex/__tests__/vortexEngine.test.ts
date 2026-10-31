import {
  createVortexState,
  startVortexRound,
  spinVortex,
  collectVortex,
  calculateMultiplier,
  FIRE,
  WATER,
  EARTH,
  CONVERGENCE_BONUS_BOOST,
} from '../vortexEngine';

describe('VortexEngine Unit Tests', () => {
  describe('State Initialization and Validation', () => {
    it('creates a valid initial state', () => {
      const state = createVortexState(1000, 50);
      expect(state.balance).toBe(1000);
      expect(state.bet).toBe(50);
      expect(state.levels).toEqual({ fire: 0, water: 0, earth: 0 });
      expect(state.multiplier).toBe(1);
      expect(state.active).toBe(false);
      expect(state.bonusTriggered).toBe(false);
      expect(state.history).toHaveLength(0);
    });

    it('rejects invalid balance or bet amounts', () => {
      expect(() => createVortexState(NaN, 50)).toThrow('Invalid balance or bet');
      expect(() => createVortexState(100, -10)).toThrow('Invalid bet amount');
      expect(() => createVortexState(100, 0)).toThrow('Invalid bet amount');
      expect(() => createVortexState(100, 200)).toThrow('Invalid bet amount');
    });

    it('starts round and deducts bet amount from balance', () => {
      const state = createVortexState(1000, 50);
      const activeState = startVortexRound(state);
      expect(activeState.active).toBe(true);
      expect(activeState.balance).toBe(950);
      expect(activeState.multiplier).toBe(1);
    });

    it('prevents starting an already active round', () => {
      const state = createVortexState(1000, 50);
      const activeState = startVortexRound(state);
      expect(() => startVortexRound(activeState)).toThrow('Round already active');
    });
  });

  describe('Elemental Progression & Boundaries', () => {
    it('progresses Fire levels correctly up to maximum boundary', () => {
      let state = startVortexRound(createVortexState(1000, 50));

      for (let i = 0; i < FIRE.length; i++) {
        state = spinVortex(state, 'FIRE');
        expect(state.levels.fire).toBe(i + 1);
        expect(state.multiplier).toBe(FIRE[i]);
      }

      // Max level boundary check
      expect(state.levels.fire).toBe(FIRE.length);
      state = spinVortex(state, 'FIRE');
      expect(state.levels.fire).toBe(FIRE.length); // Capped at length
      expect(state.multiplier).toBe(70);
    });

    it('progresses Water levels correctly up to maximum boundary', () => {
      let state = startVortexRound(createVortexState(1000, 50));

      for (let i = 0; i < WATER.length; i++) {
        state = spinVortex(state, 'WATER');
        expect(state.levels.water).toBe(i + 1);
        expect(state.multiplier).toBe(WATER[i]);
      }

      expect(state.levels.water).toBe(WATER.length);
      state = spinVortex(state, 'WATER');
      expect(state.levels.water).toBe(WATER.length);
      expect(state.multiplier).toBe(5);
    });

    it('progresses Earth levels correctly up to maximum boundary', () => {
      let state = startVortexRound(createVortexState(1000, 50));

      for (let i = 0; i < EARTH.length; i++) {
        state = spinVortex(state, 'EARTH');
        expect(state.levels.earth).toBe(i + 1);
        expect(state.multiplier).toBe(EARTH[i]);
      }

      expect(state.levels.earth).toBe(EARTH.length);
      state = spinVortex(state, 'EARTH');
      expect(state.levels.earth).toBe(EARTH.length);
      expect(state.multiplier).toBe(25);
    });

    it('Wind event creates boost without increasing levels', () => {
      let state = startVortexRound(createVortexState(1000, 50));
      state = spinVortex(state, 'WIND');
      expect(state.levels).toEqual({ fire: 0, water: 0, earth: 0 });
      expect(state.multiplier).toBe(1);
      expect(state.message).toBe('Wind boost activated');
    });
  });

  describe('Skull Reduction Priority Rules', () => {
    it('reduces Fire first when Fire level > 0', () => {
      let state = startVortexRound(createVortexState(1000, 50));
      state = spinVortex(state, 'FIRE');
      state = spinVortex(state, 'EARTH');
      state = spinVortex(state, 'WATER');
      // Levels: fire=1, earth=1, water=1
      expect(state.levels).toEqual({ fire: 1, water: 1, earth: 1 });

      state = spinVortex(state, 'SKULL');
      // Fire should be reduced first
      expect(state.levels.fire).toBe(0);
      expect(state.levels.earth).toBe(1);
      expect(state.levels.water).toBe(1);
    });

    it('reduces Earth next when Fire is 0', () => {
      let state = startVortexRound(createVortexState(1000, 50));
      state = spinVortex(state, 'EARTH');
      state = spinVortex(state, 'WATER');
      // Levels: fire=0, earth=1, water=1

      state = spinVortex(state, 'SKULL');
      // Earth should be reduced next
      expect(state.levels.fire).toBe(0);
      expect(state.levels.earth).toBe(0);
      expect(state.levels.water).toBe(1);
    });

    it('reduces Water when Fire and Earth are 0', () => {
      let state = startVortexRound(createVortexState(1000, 50));
      state = spinVortex(state, 'WATER');
      expect(state.levels.water).toBe(1);

      state = spinVortex(state, 'SKULL');
      expect(state.levels.water).toBe(0);
    });

    it('does not reduce below 0 when all levels are already 0', () => {
      let state = startVortexRound(createVortexState(1000, 50));
      expect(state.levels).toEqual({ fire: 0, water: 0, earth: 0 });

      state = spinVortex(state, 'SKULL');
      expect(state.levels).toEqual({ fire: 0, water: 0, earth: 0 });
      expect(state.multiplier).toBe(1);
    });
  });

  describe('Bonus Convergence and Payout Collection', () => {
    it('triggers Convergence Bonus once when Fire, Water, Earth all reach level >= 1', () => {
      let state = startVortexRound(createVortexState(1000, 50));
      state = spinVortex(state, 'FIRE'); // fire=1, mult=3
      expect(state.bonusTriggered).toBe(false);

      state = spinVortex(state, 'WATER'); // water=1, mult=3
      expect(state.bonusTriggered).toBe(false);

      state = spinVortex(state, 'EARTH'); // earth=1 -> Convergence!
      expect(state.bonusTriggered).toBe(true);
      // Max base multiplier is FIRE[0]=3, plus CONVERGENCE_BONUS_BOOST=2.0 -> 5.0
      expect(state.multiplier).toBe(5);

      // Subsequent spin should not re-trigger bonus
      state = spinVortex(state, 'FIRE'); // fire=2 -> FIRE[1]=5 + 2.0 = 7.0
      expect(state.bonusTriggered).toBe(true);
      expect(state.multiplier).toBe(7);
    });

    it('correctly calculates payout and credits balance on collect', () => {
      let state = startVortexRound(createVortexState(1000, 100)); // balance 900
      state = spinVortex(state, 'FIRE'); // mult = 3
      state = spinVortex(state, 'FIRE'); // mult = 5

      const collected = collectVortex(state);
      expect(collected.active).toBe(false);
      // Payout = 100 * 5 = 500. Balance = 900 + 500 = 1400
      expect(collected.balance).toBe(1400);
      expect(collected.message).toBe('Collected 500');
    });

    it('prevents double collect on an already collected round', () => {
      let state = startVortexRound(createVortexState(1000, 50));
      state = spinVortex(state, 'FIRE');
      const collected = collectVortex(state);
      expect(() => collectVortex(collected)).toThrow('No active round');
    });

    it('prevents spinning on an inactive or collected round', () => {
      let state = startVortexRound(createVortexState(1000, 50));
      const collected = collectVortex(state);
      expect(() => spinVortex(collected)).toThrow('No active round');
    });
  });
});

