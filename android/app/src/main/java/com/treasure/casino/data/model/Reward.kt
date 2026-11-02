package com.treasure.casino.data.model

data class Reward(
    val id: String,
    val title: String,
    val description: String,
    val bonusAmount: Double,
    val type: String, // DAILY_LOGIN, VIP_UPGRADE, DEPOSIT_MATCH, CASHBACK
    val isClaimed: Boolean = false,
    val expiresAt: String? = null
)

data class VipStatus(
    val currentLevel: Int = 1,
    val levelName: String = "Bronze",
    val points: Int = 120,
    val pointsToNextLevel: Int = 500,
    val cashbackPercent: Double = 1.0,
    val bonusMultiplier: Double = 1.0,
    val perks: List<String> = listOf("Standard Support", "Daily Lucky Wheel")
)

data class VipTier(
    val level: Int,
    val name: String,
    val requiredPoints: Int,
    val cashbackPercent: Double,
    val bonusMultiplier: Double,
    val perks: List<String>
)

data class CouponApplyRequest(
    val code: String
)

