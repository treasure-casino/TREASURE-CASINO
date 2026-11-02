package com.treasure.casino.data.model

data class Wallet(
    val id: String,
    val userId: String,
    val balance: Double = 10000.0,
    val reservedBalance: Double = 0.0,
    val currency: String = "INR",
    val updatedAt: String? = null
)

data class WalletTransaction(
    val id: String,
    val walletId: String? = null,
    val type: String, // DEPOSIT, WITHDRAWAL, BET, WIN, REWARD
    val amount: Double,
    val status: String, // COMPLETED, PENDING, FAILED
    val description: String? = null,
    val referenceId: String? = null,
    val createdAt: String
)

data class DepositRequest(
    val amount: Double,
    val paymentMethod: String = "UPI_SIMULATED"
)

data class WithdrawRequest(
    val amount: Double,
    val accountHolder: String,
    val accountNumber: String,
    val ifscCode: String
)

