package com.treasure.casino.data.model

data class ReferralStats(
    val referralCode: String,
    val totalInvited: Int = 0,
    val successfulInvites: Int = 0,
    val totalEarnings: Double = 0.0,
    val commissionRate: Double = 5.0
)

data class ReferralRecord(
    val id: String,
    val refereeName: String,
    val joinedAt: String,
    val earnedBonus: Double,
    val status: String // ACTIVE, PENDING
)

data class ApplyReferralRequest(
    val referralCode: String
)

