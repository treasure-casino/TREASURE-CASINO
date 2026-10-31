import crypto from 'crypto';
import { prisma } from '../prisma';
import { ApiError } from '../utils/ApiError';

export class DemoWalletService {
  /**
   * Hashes a client-supplied demo token (or generates one if omitted)
   */
  private static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token.trim()).digest('hex');
  }

  /**
   * Gets or initializes a demo wallet with ₹10,000.00
   */
  public static async getOrCreateWallet(rawToken?: string): Promise<{ id: string; balance: number; token: string }> {
    const token = rawToken && rawToken.trim().length >= 8 ? rawToken.trim() : crypto.randomBytes(16).toString('hex');
    const tokenHash = this.hashToken(token);

    let wallet = await prisma.demoWallet.findUnique({
      where: { tokenHash },
    });

    if (!wallet) {
      wallet = await prisma.demoWallet.create({
        data: {
          tokenHash,
          balance: 10000.00,
        },
      });
    }

    return {
      id: wallet.id,
      balance: parseFloat(wallet.balance.toString()),
      token,
    };
  }

  /**
   * Resets demo wallet balance to ₹10,000.00
   */
  public static async resetWallet(rawToken: string): Promise<number> {
    if (!rawToken) {
      throw ApiError.badRequest('Demo token is required');
    }
    const tokenHash = this.hashToken(rawToken);

    const wallet = await prisma.demoWallet.upsert({
      where: { tokenHash },
      update: { balance: 10000.00 },
      create: { tokenHash, balance: 10000.00 },
    });

    return parseFloat(wallet.balance.toString());
  }

  /**
   * Atomically deducts a bet from the demo wallet
   */
  public static async deductBet(walletId: string, betAmount: number): Promise<{ balanceBefore: number; balanceAfter: number }> {
    return await prisma.$transaction(async (tx) => {
      const wallet = await tx.demoWallet.findUnique({
        where: { id: walletId },
      });

      if (!wallet) {
        throw ApiError.notFound('Demo wallet not found');
      }

      const balanceBefore = parseFloat(wallet.balance.toString());
      if (balanceBefore < betAmount) {
        throw ApiError.badRequest(`Insufficient demo balance (Available: ₹${balanceBefore.toFixed(2)}, Required: ₹${betAmount.toFixed(2)})`);
      }

      const balanceAfter = +(balanceBefore - betAmount).toFixed(2);

      await tx.demoWallet.update({
        where: { id: walletId },
        data: { balance: balanceAfter },
      });

      return { balanceBefore, balanceAfter };
    });
  }

  /**
   * Atomically adds winnings to the demo wallet
   */
  public static async creditWin(walletId: string, winAmount: number): Promise<number> {
    const updated = await prisma.demoWallet.update({
      where: { id: walletId },
      data: {
        balance: {
          increment: +winAmount.toFixed(2),
        },
      },
    });

    return parseFloat(updated.balance.toString());
  }
}

