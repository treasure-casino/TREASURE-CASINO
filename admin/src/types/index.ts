export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions?: { id: string; resource: string; action: string }[];
}

export interface UserProfile {
  id: string;
  userId: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  dateOfBirth?: string | null;
  country?: string | null;
  address?: string | null;
  city?: string | null;
  zipCode?: string | null;
  bio?: string | null;
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number | string;
  reservedBalance: number | string;
  currency: string;
  version: number;
}

export interface UserItem {
  id: string;
  email: string;
  phone?: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'PENDING_VERIFICATION';
  referralCode: string;
  createdAt: string;
  profile?: UserProfile | null;
  wallet?: Wallet | null;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'REWARD' | 'GAME_WIN' | 'GAME_BET' | 'REFUND';
  amount: number | string;
  balanceBefore: number | string;
  balanceAfter: number | string;
  referenceId?: string | null;
  referenceType?: string | null;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  description?: string | null;
  createdAt: string;
}

export interface DepositItem {
  id: string;
  userId: string;
  paymentOrderId: string;
  amount: number | string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  transactionId?: string | null;
  createdAt: string;
  completedAt?: string | null;
  user?: {
    id: string;
    email: string;
    phone?: string | null;
  };
  paymentOrder?: {
    id: string;
    provider: string;
    status: string;
  };
}

export interface WithdrawalItem {
  id: string;
  userId: string;
  amount: number | string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  bankDetails?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reason?: string | null;
  transactionId?: string | null;
  createdAt: string;
  completedAt?: string | null;
  user?: {
    id: string;
    email: string;
    phone?: string | null;
  };
}

export type GameCategoryType =
  | 'POPULAR'
  | 'SLOTS'
  | 'FISHING'
  | 'TABLE_CARD'
  | 'BINGO'
  | 'CASINO'
  | 'CRASH'
  | 'PLINKO'
  | 'MINES'
  | 'SPORTS'
  | 'ROULETTE_DICE'
  | 'KENO'
  | 'OTHER';

export interface GameItem {
  id: string;
  name: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  imageUrl?: string | null;
  category: GameCategoryType;
  providerId: string;
  providerCode?: string;
  providerGameId?: string;
  isActive: boolean;
  isFeatured?: boolean;
  isPopular?: boolean;
  isDemo: boolean;
  sortOrder: number;
  volatility?: string | null;
  rtp?: number | string | null;
  minBet?: number | string | null;
  maxBet?: number | string | null;
  integrationStatus?: string;
  provider?: {
    id: string;
    name: string;
    code?: string;
  };
}

export interface GameProvider {
  id: string;
  name: string;
  apiBaseUrl?: string | null;
  isActive: boolean;
  _count?: {
    games: number;
  };
}

export interface AuditLogItem {
  id: string;
  adminUserId: string;
  action: string;
  resource: string;
  resourceId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  admin?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface SystemSettingItem {
  id: string;
  key: string;
  value: string;
  description?: string | null;
  updatedBy?: string | null;
  updatedAt: string;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalDeposits: number;
  totalWithdrawals: number;
  pendingWithdrawalsCount: number;
  activeGamesCount: number;
  openTicketsCount: number;
  grossGamingRevenue: number;
}

export interface DashboardCharts {
  revenueTimeline: {
    day: string;
    deposits: number;
    withdrawals: number;
    users: number;
  }[];
  gamesByCategory: {
    category: string;
    _count: { id: number };
  }[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

