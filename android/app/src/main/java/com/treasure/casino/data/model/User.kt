package com.treasure.casino.data.model

data class User(
    val id: String,
    val email: String,
    val phone: String? = null,
    val displayName: String,
    val avatarUrl: String? = null,
    val role: String = "PLAYER",
    val status: String = "ACTIVE",
    val vipLevel: Int = 1,
    val referralCode: String? = null,
    val createdAt: String? = null
)

data class UserProfile(
    val user: User,
    val wallet: Wallet,
    val vipStatus: VipStatus? = null,
    val totalWagers: Double = 0.0,
    val totalDeposited: Double = 0.0,
    val totalWithdrawn: Double = 0.0
)

data class LoginRequest(
    val email: String,
    val password: String
)

data class RegisterRequest(
    val email: String,
    val phone: String? = null,
    val password: String,
    val displayName: String,
    val referralCode: String? = null
)

data class AuthResponse(
    val token: String,
    val refreshToken: String? = null,
    val user: User
)

data class ForgotPasswordRequest(
    val email: String
)

data class ResetPasswordRequest(
    val email: String,
    val otp: String,
    val newPassword: String
)

