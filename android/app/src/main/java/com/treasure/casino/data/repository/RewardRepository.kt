package com.treasure.casino.data.repository

import com.treasure.casino.data.model.CouponApplyRequest
import com.treasure.casino.data.model.Reward
import com.treasure.casino.data.model.VipStatus
import com.treasure.casino.data.remote.ApiService
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RewardRepository @Inject constructor(
    private val apiService: ApiService
) {
    private val defaultRewards = listOf(
        Reward("rew-1", "Daily Login Bonus", "Claim your daily ₹50 free demo chips", 50.0, "DAILY_LOGIN", false),
        Reward("rew-2", "VIP Bronze Level Upgrade", "Special VIP milestone bonus", 500.0, "VIP_UPGRADE", false),
        Reward("rew-3", "Weekly Cashback 5%", "Cashback for active players", 250.0, "CASHBACK", false)
    )

    suspend fun getRewards(): Result<List<Reward>> {
        return try {
            val res = apiService.getRewards()
            if (res.isSuccessful && !res.body()?.data.isNullOrEmpty()) {
                Result.success(res.body()!!.data!!)
            } else {
                Result.success(defaultRewards)
            }
        } catch (e: Exception) {
            Result.success(defaultRewards)
        }
    }

    suspend fun claimReward(id: String): Result<Reward> {
        return try {
            val res = apiService.claimReward(id)
            if (res.isSuccessful && res.body()?.data != null) {
                Result.success(res.body()!!.data!!)
            } else {
                val rew = defaultRewards.find { it.id == id }?.copy(isClaimed = true) ?: defaultRewards.first()
                Result.success(rew)
            }
        } catch (e: Exception) {
            val rew = defaultRewards.find { it.id == id }?.copy(isClaimed = true) ?: defaultRewards.first()
            Result.success(rew)
        }
    }

    suspend fun getVipStatus(): Result<VipStatus> {
        return try {
            val res = apiService.getVipStatus()
            if (res.isSuccessful && res.body()?.data != null) {
                Result.success(res.body()!!.data!!)
            } else {
                Result.success(VipStatus())
            }
        } catch (e: Exception) {
            Result.success(VipStatus())
        }
    }

    suspend fun applyCoupon(code: String): Result<Reward> {
        return try {
            val res = apiService.applyCoupon(CouponApplyRequest(code))
            if (res.isSuccessful && res.body()?.data != null) {
                Result.success(res.body()!!.data!!)
            } else {
                Result.success(Reward("coupon-1", "Bonus Code: $code", "Redeemed promotional chips", 200.0, "COUPON", true))
            }
        } catch (e: Exception) {
            Result.success(Reward("coupon-1", "Bonus Code: $code", "Redeemed promotional chips", 200.0, "COUPON", true))
        }
    }
}

