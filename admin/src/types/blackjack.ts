export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | '?';

export interface BlackjackCard {
  suit: Suit;
  rank: Rank;
  value: number;
  isAce: boolean;
  code: string;
}

export type BlackjackGameStatus = 'ACTIVE' | 'SETTLED';

export type BlackjackResult =
  | 'IN_PLAY'
  | 'PLAYER_BLACKJACK'
  | 'DEALER_BLACKJACK'
  | 'PUSH'
  | 'PLAYER_BUST'
  | 'DEALER_BUST'
  | 'PLAYER_WIN'
  | 'DEALER_WIN';

export type InsuranceResult = 'WON' | 'LOST' | 'DECLINED' | 'NONE';

export interface BlackjackRoundData {
  roundId: string;
  betAmount: number;
  status: BlackjackGameStatus;
  result: BlackjackResult;
  message: string;
  playerCards: BlackjackCard[];
  playerScore: number;
  isPlayerSoft: boolean;
  isPlayerBlackjack: boolean;
  dealerCards: BlackjackCard[];
  dealerScore: number;
  isDealerBlackjack: boolean;
  canHit: boolean;
  canStand: boolean;
  canDoubleDown: boolean;
  payout: number;
  multiplier: number;
  balance: number;
  hasActiveRound?: boolean;
  // Insurance Details
  insuranceOffered: boolean;
  insuranceBetAmount: number;
  insuranceDecided: boolean;
  insurancePurchased: boolean;
  insuranceBet: number;
  insurancePayout: number;
  insuranceResult: InsuranceResult;
}

export interface BlackjackHistoryItem {
  id: string;
  betAmount: number;
  payout: number;
  multiplier: number;
  profit: number;
  isWin: boolean;
  isPush: boolean;
  playerScore: number;
  dealerScore: number;
  playerCards: BlackjackCard[];
  dealerCards: BlackjackCard[];
  insurancePurchased?: boolean;
  insuranceBet?: number;
  insurancePayout?: number;
  insuranceResult?: InsuranceResult;
  startedAt: string;
}

export interface BlackjackConfig {
  minBet: number;
  maxBet: number;
  blackjackPayoutMultiplier: number;
  regularWinPayoutMultiplier: number;
  pushPayoutMultiplier: number;
  decksCount: number;
  dealerStandsOnSoft17: boolean;
}
