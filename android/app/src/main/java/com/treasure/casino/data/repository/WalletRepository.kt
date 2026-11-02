package com.treasure.casino.data.repository

import com.treasure.casino.data.model.DepositRequest
import com.treasure.casino.data.model.Wallet
import com.treasure.casino.data.model.WalletTransaction
import com.treasure.casino.data.model.WithdrawRequest
import com.treasure.casino.data.remote.ApiService
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class WalletRepository @Inject constructor(
    private val apiService: ApiService
) {
    suspend fun getWallet(): Result<Wallet> {
        return try {
            val res = apiService.getWallet()
            if (res.isSuccessful && res.body()?.data != null) {
                Result.success(res.body()!!.data!!)
            } else {
                // Return default demo wallet if API endpoint not authenticated
                Result.success(Wallet(id = "demo-wallet", userId = "demo-user", balance = 10000.0))
            }
        } catch (e: Exception) {
            Result.success(Wallet(id = "demo-wallet", userId = "demo-user", balance = 10000.0))
        }
    }

    suspend fun getTransactions(): Result<List<WalletTransaction>> {
        return try {
            val res = apiService.getWalletTransactions()
            if (res.isSuccessful && res.body()?.data != null) {
                Result.success(res.body()!!.data!!)
            } else {
                Result.success(emptyList())
            }
        } catch (e: Exception) {
            Result.success(emptyList())
        }
    }

    suspend fun deposit(amount: Double): Result<WalletTransaction> {
        return try {
            val res = apiService.deposit(DepositRequest(amount))
            if (res.isSuccessful && res.body()?.data != null) {
                Result.success(res.body()!!.data!!)
            } else {
                Result.failure(Exception(res.body()?.message ?: "Deposit failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun withdraw(amount: Double, holder: String, acc: String, ifsc: String): Result<WalletTransaction> {
        return try {
            val res = apiService.withdraw(WithdrawRequest(amount, holder, acc, ifsc))
            if (res.isSuccessful && res.body()?.data != null) {
                Result.success(res.body()!!.data!!)
            } else {
                Result.failure(Exception(res.body()?.message ?: "Withdrawal failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

