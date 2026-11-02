import React, { useState, useEffect, useRef } from 'react';
import {
  BlackjackCard,
  BlackjackRoundData,
  BlackjackHistoryItem,
  BlackjackConfig,
} from '../../../types/blackjack';
import { blackjackApi } from '../../../services/blackjackApi';
import { getDemoBalance, setLocalDemoBalance } from '../../../utils/demoWallet';
import {
  Volume2,
  VolumeX,
  Sparkles,
  Trophy,
  Shield,
  Hand,
  PlusCircle,
  Zap,
} from 'lucide-react';

// Web Audio Sound Synthesizer with realistic physical friction & casino tones
class BlackjackAudio {
  private ctx: AudioContext | null = null;
  public muted = false;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Realistic physical card sliding/swoosh across felt
  playCardDeal() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1600, now);
      filter.frequency.exponentialRampToValueAtTime(750, now + 0.07);
      filter.Q.value = 2.5;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(now);
    } catch {
      // Audio fallback
    }
  }

  // Realistic card flip whoosh/snap
  playCardFlip() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.12);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // Audio fallback
    }
  }

  playChip() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(700, this.ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch {
      // Audio fallback
    }
  }

  playWin() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.2, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.25);
      });
    } catch {
      // Audio fallback
    }
  }

  playBlackjack() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.3, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.35);
      });
    } catch {
      // Audio fallback
    }
  }

  playBust() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch {
      // Audio fallback
    }
  }
}

const audio = new BlackjackAudio();
const QUICK_CHIPS = [10, 50, 100, 500, 1000];

// Interface for a displayed card on table with 3D orientation state
interface DisplayedTableCard {
  card: BlackjackCard;
  isFaceDown: boolean;
  isNewlyDealt?: boolean;
}

// ── Realistic 3D Flippable Playing Card Component ──
interface PlayingCardProps {
  card: BlackjackCard;
  isFaceDown: boolean;
  isNewlyDealt?: boolean;
}

const PlayingCard: React.FC<PlayingCardProps> = ({ card, isFaceDown, isNewlyDealt }) => {
  const isRed = card.suit === '♥' || card.suit === '♦';

  return (
    <div
      className={`relative w-16 h-24 sm:w-20 sm:h-28 md:w-24 md:h-36 perspective-1000 select-none ${
        isNewlyDealt ? 'animate-deal-card' : ''
      }`}
    >
      <div
        className="w-full h-full relative transform-style-3d card-flip-inner transition-transform duration-500 ease-out"
        style={{
          transform: isFaceDown ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* ── CARD FRONT (FACE-UP) ── */}
        <div
          className="absolute inset-0 backface-hidden bg-white rounded-xl border border-gray-300 shadow-2xl flex flex-col justify-between p-1.5 sm:p-2 overflow-hidden"
          style={{
            transform: 'rotateY(0deg)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
          }}
        >
          {/* Top-Left Rank & Suit */}
          <div className={`flex flex-col items-start leading-none font-bold ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
            <span className="text-sm sm:text-base md:text-lg font-black">{card.rank}</span>
            <span className="text-xs sm:text-sm">{card.suit}</span>
          </div>

          {/* Center Giant Watermark Suit */}
          <div
            className={`absolute inset-0 flex items-center justify-center text-3xl sm:text-4xl md:text-5xl pointer-events-none opacity-85 ${
              isRed ? 'text-red-600' : 'text-gray-900'
            }`}
          >
            {card.suit}
          </div>

          {/* Bottom-Right Inverted Rank & Suit */}
          <div className={`flex flex-col items-end leading-none font-bold self-end rotate-180 ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
            <span className="text-sm sm:text-base md:text-lg font-black">{card.rank}</span>
            <span className="text-xs sm:text-sm">{card.suit}</span>
          </div>
        </div>

        {/* ── CARD BACK (FACE-DOWN) ── */}
        <div
          className="absolute inset-0 backface-hidden rounded-xl border-2 border-amber-500/80 shadow-2xl overflow-hidden p-1"
          style={{
            transform: 'rotateY(180deg)',
            background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.7)',
          }}
        >
          <div className="w-full h-full rounded-lg border border-gold/50 flex flex-col items-center justify-center p-1 bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:6px_6px]">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-gold/70 flex items-center justify-center bg-dark-900/90 shadow">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold animate-spin" />
            </div>
            <span className="text-[7px] sm:text-[8px] font-cinzel font-black text-gold tracking-widest mt-1">
              TREASURE
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const TreasureBlackjack2D: React.FC = () => {
  // Game State
  const [balance, setBalance] = useState<number>(getDemoBalance());
  const [betAmount, setBetAmount] = useState<number>(100);
  const [config, setConfig] = useState<BlackjackConfig>({
    minBet: 10,
    maxBet: 5000,
    blackjackPayoutMultiplier: 2.5,
    regularWinPayoutMultiplier: 2.0,
    pushPayoutMultiplier: 1.0,
    decksCount: 6,
    dealerStandsOnSoft17: true,
  });

  const [round, setRound] = useState<BlackjackRoundData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDealing, setIsDealing] = useState<boolean>(false);
  const [isInsuranceLoading, setIsInsuranceLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<BlackjackHistoryItem[]>([]);
  const [muted, setMuted] = useState<boolean>(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Animated visual display hands
  const [displayedPlayerCards, setDisplayedPlayerCards] = useState<DisplayedTableCard[]>([]);
  const [displayedDealerCards, setDisplayedDealerCards] = useState<DisplayedTableCard[]>([]);
  const [displayedDealerScore, setDisplayedDealerScore] = useState<string>('0');
  const [displayedPlayerScore, setDisplayedPlayerScore] = useState<string>('0');

  // Timers cleanup ref
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const clearAllTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  useEffect(() => {
    return () => clearAllTimers();
  }, []);

  // Sync Audio Mute
  const toggleMute = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    audio.muted = nextMuted;
  };

  // Fetch initial config, history, and active in-flight round
  useEffect(() => {
    let isMounted = true;

    const loadInitial = async () => {
      try {
        const [loadedConfig, loadedHistory, loadedState] = await Promise.all([
          blackjackApi.getConfig().catch(() => null),
          blackjackApi.getHistory(8).catch(() => []),
          blackjackApi.getState().catch(() => null),
        ]);

        if (!isMounted) return;

        if (loadedConfig) setConfig(loadedConfig);
        if (loadedHistory) setHistory(loadedHistory);

        if (loadedState && loadedState.hasActiveRound) {
          setRound(loadedState);
          setBalance(loadedState.balance);
          setLocalDemoBalance(loadedState.balance);

          // Restore cards on active session reconnect
          setDisplayedPlayerCards(
            loadedState.playerCards.map((c) => ({ card: c, isFaceDown: false }))
          );
          setDisplayedDealerCards(
            loadedState.dealerCards.map((c) => ({
              card: c,
              isFaceDown: c.code === 'HIDDEN',
            }))
          );
          setDisplayedPlayerScore(String(loadedState.playerScore));
          setDisplayedDealerScore(
            loadedState.status === 'SETTLED'
              ? String(loadedState.dealerScore)
              : `${loadedState.dealerScore} + ?`
          );
        }
      } catch (err) {
        console.warn('Blackjack initial load error:', err);
      }
    };

    loadInitial();
    return () => {
      isMounted = false;
    };
  }, []);

  // Settle Sound & Banner Helper
  const triggerRoundSettlementVisuals = (settledRound: BlackjackRoundData) => {
    if (settledRound.insurancePurchased && settledRound.insuranceResult === 'WON') {
      audio.playWin();
      const profit = (settledRound.insurancePayout - settledRound.insuranceBet).toFixed(2);
      setBannerMessage(`INSURANCE WON! +₹${profit} (2:1)`);
    } else if (settledRound.result === 'PLAYER_BLACKJACK') {
      audio.playBlackjack();
      setBannerMessage(`★ BLACKJACK! +₹${(settledRound.payout - settledRound.betAmount).toFixed(2)} ★`);
    } else if (settledRound.result === 'PLAYER_WIN' || settledRound.result === 'DEALER_BUST') {
      audio.playWin();
      setBannerMessage(`WINNER! +₹${(settledRound.payout - settledRound.betAmount).toFixed(2)}`);
    } else if (settledRound.result === 'PUSH') {
      audio.playChip();
      setBannerMessage('PUSH — BET RETURNED');
    } else if (settledRound.result === 'PLAYER_BUST') {
      audio.playBust();
      setBannerMessage('BUSTED OVER 21');
    } else {
      audio.playBust();
      setBannerMessage('DEALER WINS');
    }

    blackjackApi.getHistory(8).then(setHistory).catch(() => {});
  };

  // ── Action: Deal Hand ──
  const handleDeal = async () => {
    if (isLoading || isDealing || (round && round.status === 'ACTIVE')) return;
    setError(null);
    setBannerMessage(null);
    clearAllTimers();
    setIsLoading(true);

    try {
      const data = await blackjackApi.deal(betAmount);
      setBalance(data.balance);
      setLocalDemoBalance(data.balance);
      setIsLoading(false);
      setIsDealing(true);

      // Clear table for new deal sequence
      setDisplayedPlayerCards([]);
      setDisplayedDealerCards([]);
      setDisplayedPlayerScore('0');
      setDisplayedDealerScore('0');

      const p1 = data.playerCards[0];
      const d1 = data.dealerCards[0];
      const p2 = data.playerCards[1];
      const d2 = data.dealerCards[1];

      // Sequential deal timing:
      // t = 0ms: Player Card 1
      timersRef.current.push(
        setTimeout(() => {
          audio.playCardDeal();
          setDisplayedPlayerCards([{ card: p1, isFaceDown: false, isNewlyDealt: true }]);
        }, 0)
      );

      // t = 240ms: Dealer Card 1 (Face Up)
      timersRef.current.push(
        setTimeout(() => {
          audio.playCardDeal();
          setDisplayedDealerCards([{ card: d1, isFaceDown: false, isNewlyDealt: true }]);
          setDisplayedDealerScore(`${d1.value} + ?`);
        }, 240)
      );

      // t = 480ms: Player Card 2
      timersRef.current.push(
        setTimeout(() => {
          audio.playCardDeal();
          setDisplayedPlayerCards([
            { card: p1, isFaceDown: false },
            { card: p2, isFaceDown: false, isNewlyDealt: true },
          ]);
          setDisplayedPlayerScore(data.isPlayerBlackjack ? 'BLACKJACK (21)' : String(data.playerScore));
        }, 480)
      );

      // t = 720ms: Dealer Card 2 (Face Down Hole Card)
      timersRef.current.push(
        setTimeout(() => {
          audio.playCardDeal();
          setDisplayedDealerCards([
            { card: d1, isFaceDown: false },
            { card: d2, isFaceDown: true, isNewlyDealt: true },
          ]);
        }, 720)
      );

      // t = 1000ms: Conclude Deal & Handle Immediate Naturals or Continue Round
      timersRef.current.push(
        setTimeout(() => {
          setRound(data);

          if (data.status === 'SETTLED') {
            // Instant settlement (e.g. Natural Blackjack on Deal)
            // Flip hole card smoothly
            timersRef.current.push(
              setTimeout(() => {
                audio.playCardFlip();
                setDisplayedDealerCards([
                  { card: d1, isFaceDown: false },
                  { card: d2, isFaceDown: false },
                ]);
                setDisplayedDealerScore(String(data.dealerScore));

                timersRef.current.push(
                  setTimeout(() => {
                    setIsDealing(false);
                    triggerRoundSettlementVisuals(data);
                  }, 500)
                );
              }, 400)
            );
          } else {
            setIsDealing(false);
          }
        }, 1000)
      );
    } catch (err: any) {
      setIsLoading(false);
      setIsDealing(false);
      setError(err?.userFacingMessage || err?.message || 'Failed to deal hand');
    }
  };

  // ── Action: Hit Card ──
  const handleHit = async () => {
    if (!round || round.status !== 'ACTIVE' || isLoading || isDealing || !round.canHit) return;
    setError(null);
    setIsLoading(true);

    try {
      const data = await blackjackApi.hit(round.roundId);
      setBalance(data.balance);
      setLocalDemoBalance(data.balance);
      setIsLoading(false);
      setIsDealing(true);

      const latestCard = data.playerCards[data.playerCards.length - 1];
      audio.playCardDeal();

      setDisplayedPlayerCards((prev) => [
        ...prev.map((c) => ({ ...c, isNewlyDealt: false })),
        { card: latestCard, isFaceDown: false, isNewlyDealt: true },
      ]);
      setDisplayedPlayerScore(String(data.playerScore));

      timersRef.current.push(
        setTimeout(() => {
          setRound(data);

          if (data.status === 'SETTLED') {
            // Flip dealer hole card on bust or settlement
            timersRef.current.push(
              setTimeout(() => {
                audio.playCardFlip();
                setDisplayedDealerCards(
                  data.dealerCards.map((c) => ({ card: c, isFaceDown: false }))
                );
                setDisplayedDealerScore(String(data.dealerScore));

                timersRef.current.push(
                  setTimeout(() => {
                    setIsDealing(false);
                    triggerRoundSettlementVisuals(data);
                  }, 450)
                );
              }, 300)
            );
          } else {
            setIsDealing(false);
          }
        }, 400)
      );
    } catch (err: any) {
      setIsLoading(false);
      setIsDealing(false);
      setError(err?.userFacingMessage || err?.message || 'Failed to hit card');
    }
  };

  // ── Action: Stand (Dealer's Turn Sequence) ──
  const handleStand = async () => {
    if (!round || round.status !== 'ACTIVE' || isLoading || isDealing || !round.canStand) return;
    setError(null);
    setIsLoading(true);

    try {
      const data = await blackjackApi.stand(round.roundId);
      setBalance(data.balance);
      setLocalDemoBalance(data.balance);
      setIsLoading(false);
      setIsDealing(true);

      // 1. Flip the Dealer Hole Card (Card index 1)
      audio.playCardFlip();
      const initialTwoDealerCards = [
        { card: data.dealerCards[0], isFaceDown: false },
        { card: data.dealerCards[1], isFaceDown: false },
      ];
      setDisplayedDealerCards(initialTwoDealerCards);

      // 2. Extra dealer draws if dealer drew cards to reach 17+
      const extraCards = data.dealerCards.slice(2);
      let stepDelay = 550;

      if (extraCards.length > 0) {
        extraCards.forEach((extraCard, idx) => {
          timersRef.current.push(
            setTimeout(() => {
              audio.playCardDeal();
              setDisplayedDealerCards((prev) => [
                ...prev.map((c) => ({ ...c, isNewlyDealt: false })),
                { card: extraCard, isFaceDown: false, isNewlyDealt: true },
              ]);
            }, stepDelay)
          );
          stepDelay += 420;
        });
      }

      // 3. Finalize score & announce settlement
      timersRef.current.push(
        setTimeout(() => {
          setDisplayedDealerScore(String(data.dealerScore));
          setRound(data);
          setIsDealing(false);
          triggerRoundSettlementVisuals(data);
        }, stepDelay + 100)
      );
    } catch (err: any) {
      setIsLoading(false);
      setIsDealing(false);
      setError(err?.userFacingMessage || err?.message || 'Failed to stand');
    }
  };

  // ── Action: Double Down ──
  const handleDoubleDown = async () => {
    if (!round || round.status !== 'ACTIVE' || isLoading || isDealing || !round.canDoubleDown) return;
    if (balance < round.betAmount) {
      setError('Insufficient demo balance to Double Down');
      return;
    }
    setError(null);
    setIsLoading(true);
    audio.playChip();

    try {
      const data = await blackjackApi.doubleDown(round.roundId);
      setBalance(data.balance);
      setLocalDemoBalance(data.balance);
      setIsLoading(false);
      setIsDealing(true);

      // 1. Deal exactly 1 card to player
      const finalPlayerCard = data.playerCards[data.playerCards.length - 1];
      audio.playCardDeal();
      setDisplayedPlayerCards((prev) => [
        ...prev.map((c) => ({ ...c, isNewlyDealt: false })),
        { card: finalPlayerCard, isFaceDown: false, isNewlyDealt: true },
      ]);
      setDisplayedPlayerScore(String(data.playerScore));

      // 2. Flip dealer hole card
      let stepDelay = 550;
      timersRef.current.push(
        setTimeout(() => {
          audio.playCardFlip();
          setDisplayedDealerCards([
            { card: data.dealerCards[0], isFaceDown: false },
            { card: data.dealerCards[1], isFaceDown: false },
          ]);
        }, stepDelay)
      );

      // 3. Extra dealer cards if any
      const extraCards = data.dealerCards.slice(2);
      stepDelay += 500;

      if (extraCards.length > 0) {
        extraCards.forEach((extraCard) => {
          timersRef.current.push(
            setTimeout(() => {
              audio.playCardDeal();
              setDisplayedDealerCards((prev) => [
                ...prev.map((c) => ({ ...c, isNewlyDealt: false })),
                { card: extraCard, isFaceDown: false, isNewlyDealt: true },
              ]);
            }, stepDelay)
          );
          stepDelay += 420;
        });
      }

      // 4. Finalize
      timersRef.current.push(
        setTimeout(() => {
          setDisplayedDealerScore(String(data.dealerScore));
          setRound(data);
          setIsDealing(false);
          triggerRoundSettlementVisuals(data);
        }, stepDelay + 100)
      );
    } catch (err: any) {
      setIsLoading(false);
      setIsDealing(false);
      setError(err?.userFacingMessage || err?.message || 'Failed to double down');
    }
  };

  // ── Action: Insurance ──
  const handleInsurance = async (buy: boolean) => {
    if (
      !round ||
      round.status !== 'ACTIVE' ||
      !round.insuranceOffered ||
      round.insuranceDecided ||
      isInsuranceLoading ||
      isDealing
    ) {
      return;
    }
    if (buy && balance < round.insuranceBetAmount) {
      setError('Insufficient demo balance for Insurance');
      return;
    }

    setError(null);
    setIsInsuranceLoading(true);
    if (buy) audio.playChip();

    try {
      const data = await blackjackApi.insurance(round.roundId, buy);
      setRound(data);
      setBalance(data.balance);
      setLocalDemoBalance(data.balance);
      setIsInsuranceLoading(false);

      // If dealer has blackjack, round settled immediately -> flip hole card!
      if (data.status === 'SETTLED') {
        setIsDealing(true);
        audio.playCardFlip();
        setDisplayedDealerCards([
          { card: data.dealerCards[0], isFaceDown: false },
          { card: data.dealerCards[1], isFaceDown: false },
        ]);
        setDisplayedDealerScore(String(data.dealerScore));

        timersRef.current.push(
          setTimeout(() => {
            setIsDealing(false);
            triggerRoundSettlementVisuals(data);
          }, 500)
        );
      }
    } catch (err: any) {
      setIsInsuranceLoading(false);
      setError(err?.userFacingMessage || err?.message || 'Failed to process insurance');
    }
  };

  // Keyboard Shortcuts: Space (Deal), H (Hit), S (Stand), D (Double)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) return;

      if (isWaitingForInsurance) {
        if (e.key === '1' || e.key.toLowerCase() === 'y') {
          e.preventDefault();
          handleInsurance(true);
        } else if (e.key === '2' || e.key.toLowerCase() === 'n') {
          e.preventDefault();
          handleInsurance(false);
        }
        return;
      }

      if (e.code === 'Space') {
        if (!round || round.status === 'SETTLED') {
          e.preventDefault();
          handleDeal();
        }
      } else if (e.key.toLowerCase() === 'h') {
        if (round && round.status === 'ACTIVE' && round.canHit && !isDealing && !isLoading) {
          e.preventDefault();
          handleHit();
        }
      } else if (e.key.toLowerCase() === 's') {
        if (round && round.status === 'ACTIVE' && round.canStand && !isDealing && !isLoading) {
          e.preventDefault();
          handleStand();
        }
      } else if (e.key.toLowerCase() === 'd') {
        if (round && round.status === 'ACTIVE' && round.canDoubleDown && !isDealing && !isLoading) {
          e.preventDefault();
          handleDoubleDown();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [round, isLoading, isDealing, betAmount, balance]);

  const isRoundActive = round?.status === 'ACTIVE';
  const isWaitingForInsurance = Boolean(isRoundActive && round?.insuranceOffered && !round?.insuranceDecided);
  const isActionDisabled = isLoading || isDealing || isInsuranceLoading;

  const isWinningRound =
    round?.status === 'SETTLED' &&
    (round.result === 'PLAYER_WIN' || round.result === 'PLAYER_BLACKJACK' || round.result === 'DEALER_BUST');

  return (
    <div className="relative w-full max-w-6xl mx-auto flex flex-col items-center select-none text-white p-2 sm:p-4">
      {/* ── Top Bar: Branding, Rules Ticker, Audio Toggle ── */}
      <div className="w-full flex items-center justify-between bg-dark-900/80 backdrop-blur border border-dark-800 rounded-2xl px-4 py-2.5 mb-3 shadow-lg">
        {/* Left: Branding & History pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-gold animate-pulse" />
            <span className="font-cinzel text-sm sm:text-base font-black tracking-wider text-white">
              TREASURE BLACKJACK
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-gold font-bold border border-gold/30">
              3:2 PAYOUT
            </span>
          </div>
        </div>

        {/* Center: Recent History Badges */}
        <div className="hidden lg:flex items-center gap-1.5 overflow-x-auto max-w-md">
          {history.slice(0, 6).map((h) => (
            <div
              key={h.id}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border ${
                h.multiplier >= 2.5
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : h.multiplier >= 2.0
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : h.multiplier === 1.0
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                  : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
              }`}
            >
              {h.insurancePurchased && h.insuranceResult === 'WON'
                ? 'INS 2:1'
                : h.multiplier >= 2.5
                ? 'BJ 2.5x'
                : h.multiplier >= 2.0
                ? 'WIN 2x'
                : h.multiplier === 1.0
                ? 'PUSH'
                : 'LOSE'}
            </div>
          ))}
        </div>

        {/* Right: Sound & Balance Pill */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-xl bg-dark-800/90 border border-dark-700 flex items-center gap-1.5 font-mono text-xs">
            <span className="text-gray-400">DEMO:</span>
            <span className="text-gold font-bold">₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>

          <button
            onClick={toggleMute}
            className="p-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-gray-300 hover:text-white border border-dark-700 transition"
            title={muted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-gold" />}
          </button>
        </div>
      </div>

      {/* ── Main Casino Felt Table ── */}
      <div
        className={`relative w-full rounded-3xl border-4 border-[#2b1f14] shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col justify-between p-4 sm:p-6 md:p-8 min-h-[460px] md:min-h-[520px] transition-all duration-500 ${
          isWinningRound ? 'win-table-glow' : ''
        }`}
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, #15573e 0%, #0d3827 55%, #071f16 100%)',
          boxShadow: 'inset 0 0 100px rgba(0,0,0,0.8), 0 20px 40px rgba(0,0,0,0.8)',
        }}
      >
        {/* Table Felt Subtle Silkscreen Watermarks */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center opacity-15">
          <div className="w-[300px] sm:w-[500px] h-[160px] sm:h-[240px] rounded-full border-2 border-dashed border-amber-300/60 flex items-center justify-center">
            <span className="font-cinzel text-lg sm:text-2xl font-black text-amber-200 tracking-widest text-center px-4">
              BLACKJACK PAYS 3 TO 2
              <br />
              <span className="text-xs sm:text-sm font-sans tracking-normal opacity-80">
                Dealer Must Stand on 17 • Insurance Pays 2:1
              </span>
            </span>
          </div>
        </div>

        {/* ── Visual Deck Shoe (Top Right) ── */}
        <div className="absolute top-4 right-4 z-20 flex flex-col items-center pointer-events-none">
          <div className="relative w-14 h-20 sm:w-16 sm:h-22 rounded-xl bg-gradient-to-br from-amber-950 via-dark-900 to-black border-2 border-amber-500/80 shadow-2xl p-1 flex flex-col items-center justify-center">
            {/* Card shoe stack illusion bevels */}
            <div className="absolute -top-1 -right-1 w-full h-full rounded-xl bg-dark-900 border border-amber-700/50 -z-10" />
            <div className="absolute -top-2 -right-2 w-full h-full rounded-xl bg-dark-950 border border-amber-800/40 -z-20" />
            <Sparkles className="w-4 h-4 text-gold mb-1" />
            <span className="font-cinzel text-[8px] font-black text-amber-300 tracking-wider">SHOE</span>
            <span className="text-[7px] font-mono text-gray-400 font-bold">6 DECKS</span>
          </div>
        </div>

        {/* ── Active Insurance Badge ── */}
        {round && round.insurancePurchased && (
          <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-950/85 backdrop-blur border border-amber-500/60 text-xs font-mono shadow-xl animate-in fade-in">
            <Shield className="w-4 h-4 text-amber-400" />
            <span className="text-gray-300 font-semibold">INSURANCE:</span>
            <span className="text-gold font-bold">₹{round.insuranceBet}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                round.insuranceResult === 'WON'
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                  : round.insuranceResult === 'LOST'
                  ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
                  : 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
              }`}
            >
              {round.insuranceResult === 'WON'
                ? `WON +₹${(round.insurancePayout - round.insuranceBet).toFixed(2)} (2:1)`
                : round.insuranceResult === 'LOST'
                ? 'LOST'
                : 'ACTIVE'}
            </span>
          </div>
        )}

        {/* ── INSURANCE MODAL OVERLAY ── */}
        {round && isWaitingForInsurance && (
          <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md rounded-3xl flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="relative w-full max-w-sm bg-gradient-to-b from-dark-900 via-dark-950 to-black border-2 border-amber-500/90 rounded-3xl p-6 shadow-[0_0_60px_rgba(217,119,6,0.6)] flex flex-col items-center text-center space-y-4">
              {/* Gold Shield Icon */}
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-gold/60 flex items-center justify-center text-gold shadow-lg shadow-amber-500/30 animate-pulse">
                <Shield className="w-9 h-9 text-gold" />
              </div>

              <div>
                <div className="text-[11px] font-bold text-amber-400 uppercase tracking-widest font-mono">
                  DEALER SHOWS AN ACE
                </div>
                <h3 className="text-xl sm:text-2xl font-cinzel font-black text-white mt-1">
                  BUY INSURANCE?
                </h3>
                <p className="text-xs text-gray-300 mt-2 max-w-xs leading-relaxed">
                  Protect your hand against a potential Dealer Blackjack. Insurance pays{' '}
                  <strong className="text-amber-300 font-bold">2:1 profit</strong>!
                </p>
              </div>

              {/* Insurance Breakdown Pill */}
              <div className="w-full bg-dark-800/90 border border-dark-700 rounded-2xl p-3 flex items-center justify-between shadow-inner">
                <div className="text-left">
                  <div className="text-[10px] text-gray-400 font-semibold uppercase">Cost (50% Bet)</div>
                  <div className="text-base font-black text-gold font-mono">
                    ₹{round.insuranceBetAmount.toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-gray-400 font-semibold uppercase">Pays (2:1)</div>
                  <div className="text-base font-black text-emerald-400 font-mono">
                    +₹{(round.insuranceBetAmount * 2).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="w-full flex items-center gap-2.5 pt-1">
                <button
                  onClick={() => handleInsurance(false)}
                  disabled={isInsuranceLoading}
                  className="flex-1 py-3 px-3 rounded-xl bg-dark-800 hover:bg-dark-750 text-gray-300 hover:text-white border border-dark-700 font-extrabold text-xs uppercase tracking-wider transition active:scale-95 disabled:opacity-40"
                >
                  NO INSURANCE
                </button>

                <button
                  onClick={() => handleInsurance(true)}
                  disabled={isInsuranceLoading || balance < round.insuranceBetAmount}
                  className="flex-1 py-3 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/30 transition active:scale-95 disabled:opacity-40"
                >
                  {balance < round.insuranceBetAmount ? 'LOW BALANCE' : `BUY INSURANCE`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── DEALER SECTION ── */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] sm:text-xs font-cinzel font-bold text-amber-300 tracking-wider">
              DEALER HAND
            </span>
            {displayedDealerCards.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-dark-900/80 border border-gold/40 text-gold text-xs font-mono font-bold shadow transition-all duration-300">
                {displayedDealerScore}
              </span>
            )}
          </div>

          {/* Dealer Cards Container */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 min-h-[100px] sm:min-h-[144px]">
            {displayedDealerCards.length > 0 ? (
              displayedDealerCards.map((item, idx) => (
                <PlayingCard
                  key={`dealer-${idx}-${item.card.code}`}
                  card={item.card}
                  isFaceDown={item.isFaceDown}
                  isNewlyDealt={item.isNewlyDealt}
                />
              ))
            ) : (
              <div className="text-xs text-emerald-300/40 font-mono tracking-wider italic py-4">
                Place your bet and click DEAL to begin
              </div>
            )}
          </div>
        </div>

        {/* ── CENTER BANNER / MESSAGE ANNOUNCER ── */}
        <div className="relative z-20 my-2 flex flex-col items-center justify-center min-h-[44px]">
          {bannerMessage ? (
            <div
              className={`px-6 py-2 rounded-2xl text-xs sm:text-sm md:text-base font-black tracking-wide uppercase border shadow-2xl animate-bounce ${
                round?.result === 'PLAYER_BLACKJACK'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black border-yellow-200 shadow-yellow-500/50'
                  : round?.result === 'PLAYER_WIN' || round?.result === 'DEALER_BUST'
                  ? 'bg-gradient-to-r from-emerald-600 to-green-500 text-white border-emerald-300 shadow-emerald-500/50'
                  : round?.result === 'PUSH'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-300 shadow-blue-500/50'
                  : 'bg-gradient-to-r from-rose-700 to-red-600 text-white border-rose-400 shadow-rose-600/50'
              }`}
            >
              {bannerMessage}
            </div>
          ) : isDealing ? (
            <div className="px-4 py-1.5 rounded-xl bg-dark-900/80 border border-gold/40 text-gold text-xs font-mono font-bold animate-pulse">
              DEALING CARDS...
            </div>
          ) : round?.message ? (
            <div className="px-4 py-1.5 rounded-xl bg-dark-900/70 border border-emerald-500/30 text-emerald-200 text-xs font-semibold backdrop-blur">
              {round.message}
            </div>
          ) : null}

          {error && (
            <div className="mt-2 px-4 py-1.5 rounded-xl bg-rose-950/80 border border-rose-600/60 text-rose-300 text-xs font-semibold">
              {error}
            </div>
          )}
        </div>

        {/* ── PLAYER SECTION ── */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Player Cards Container */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 min-h-[100px] sm:min-h-[144px] mb-2">
            {displayedPlayerCards.length > 0 ? (
              displayedPlayerCards.map((item, idx) => (
                <PlayingCard
                  key={`player-${idx}-${item.card.code}`}
                  card={item.card}
                  isFaceDown={item.isFaceDown}
                  isNewlyDealt={item.isNewlyDealt}
                />
              ))
            ) : (
              <div className="w-16 h-24 sm:w-20 sm:h-28 rounded-xl border-2 border-dashed border-emerald-400/20 flex items-center justify-center text-emerald-300/30 text-[10px]">
                YOUR HAND
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] sm:text-xs font-cinzel font-bold text-amber-300 tracking-wider">
              PLAYER HAND
            </span>
            {displayedPlayerCards.length > 0 && (
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold shadow border transition-all duration-300 ${
                  round?.isPlayerBlackjack
                    ? 'bg-amber-500 text-black border-yellow-200 animate-pulse'
                    : round && round.playerScore > 21
                    ? 'bg-rose-950 text-rose-300 border-rose-600'
                    : 'bg-dark-900/80 text-gold border-gold/40'
                }`}
              >
                {displayedPlayerScore}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom Controls: Chips, Bet, Action Buttons ── */}
      <div className="w-full mt-3 bg-dark-900/90 backdrop-blur border border-dark-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Quick Bet Chips (Active before deal) */}
        <div className="flex flex-col gap-1.5 w-full md:w-auto">
          <div className="flex items-center justify-between text-xs text-gray-400 font-semibold px-1">
            <span>BET AMOUNT</span>
            <span className="font-mono text-gold">Min: ₹{config.minBet} • Max: ₹{config.maxBet}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                disabled={isRoundActive || isActionDisabled}
                onClick={() => {
                  audio.playChip();
                  setBetAmount(chip);
                }}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold font-mono transition border ${
                  betAmount === chip
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black border-yellow-200 shadow-md scale-105'
                    : 'bg-dark-800 hover:bg-dark-750 text-gray-300 border-dark-700 disabled:opacity-40'
                }`}
              >
                ₹{chip}
              </button>
            ))}

            {/* Bet Step Increment/Decrement Controls */}
            <div className="flex items-center bg-dark-800 border border-dark-700 rounded-xl px-2 py-1 ml-2">
              <button
                disabled={isRoundActive || isActionDisabled || betAmount <= config.minBet}
                onClick={() => {
                  audio.playChip();
                  setBetAmount((b) => Math.max(config.minBet, b - 50));
                }}
                className="text-gray-400 hover:text-white disabled:opacity-30 font-bold px-1.5 text-base"
              >
                −
              </button>
              <span className="font-mono text-xs font-black text-gold px-2">₹{betAmount}</span>
              <button
                disabled={isRoundActive || isActionDisabled || betAmount >= config.maxBet}
                onClick={() => {
                  audio.playChip();
                  setBetAmount((b) => Math.min(config.maxBet, b + 50));
                }}
                className="text-gray-400 hover:text-white disabled:opacity-30 font-bold px-1.5 text-base"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Right: In-Play Actions (HIT, STAND, DOUBLE) OR Big DEAL Button */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          {isRoundActive ? (
            <>
              {/* HIT BUTTON */}
              <button
                onClick={handleHit}
                disabled={isActionDisabled || !round?.canHit}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-extrabold text-sm uppercase shadow-lg shadow-emerald-950/40 transition active:scale-95 disabled:opacity-40"
              >
                <PlusCircle className="w-4 h-4" />
                <span>HIT</span>
                <span className="hidden sm:inline text-[10px] font-mono opacity-80">(H)</span>
              </button>

              {/* STAND BUTTON */}
              <button
                onClick={handleStand}
                disabled={isActionDisabled || !round?.canStand}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-black font-extrabold text-sm uppercase shadow-lg shadow-amber-950/40 transition active:scale-95 disabled:opacity-40"
              >
                <Hand className="w-4 h-4" />
                <span>STAND</span>
                <span className="hidden sm:inline text-[10px] font-mono opacity-80">(S)</span>
              </button>

              {/* DOUBLE DOWN BUTTON */}
              {round?.canDoubleDown && (
                <button
                  onClick={handleDoubleDown}
                  disabled={isActionDisabled || !round?.canDoubleDown || balance < round.betAmount}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-sm uppercase shadow-lg shadow-purple-950/40 transition active:scale-95 disabled:opacity-40"
                >
                  <Zap className="w-4 h-4 text-yellow-300" />
                  <span>DOUBLE</span>
                  <span className="hidden sm:inline text-[10px] font-mono opacity-80">(D)</span>
                </button>
              )}
            </>
          ) : (
            /* DEAL BUTTON */
            <button
              onClick={handleDeal}
              disabled={isActionDisabled || betAmount > balance}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-950/50 transition active:scale-95 disabled:opacity-40"
            >
              <Sparkles className="w-4 h-4" />
              <span>DEAL HAND (₹{betAmount})</span>
              <span className="hidden sm:inline text-[10px] font-mono opacity-80">(Space)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TreasureBlackjack2D;
