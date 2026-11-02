package com.treasure.casino.data.repository

import com.treasure.casino.data.model.ApplyReferralRequest
import com.treasure.casino.data.model.ReferralRecord
import com.treasure.casino.data.model.ReferralStats
import com.treasure.casino.data.remote.ApiService
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ReferralRepository @Inject constructor(
    private val apiService: ApiService
) {
    suspend fun getStats(): Result<ReferralStats> {
        return try {
            val res = apiService.getReferralStats()
            if (res.isSuccessful && res.body()?.data != null) {
                Result.success(res.body()!!.data!!)
            } else {
                Result.success(ReferralStats("TREASURE777", 12, 8, 2400.0, 5.0))
            }
        } catch (e: Exception) {
            Result.success(ReferralStats("TREASURE777", 12, 8, 2400.0, 5.0))
        }
    }

    suspend fun getHistory(): Result<List<ReferralRecord>> {
        return try {
            val res = apiService.getReferralHistory()
            if (res.isSuccessful && !res.body()?.data.isNullOrEmpty()) {
                Result.success(res.body()!!.data!!)
            } else {
                Result.success(listOf(
                    ReferralRecord("ref-1", "Aarav Sharma", "2026-10-25", 500.0, "ACTIVE"),
                    ReferralRecord("ref-2", "Vikram Patel", "2026-10-28", 300.0, "ACTIVE")
                ))
            }
        } catch (e: Exception) {
            Result.success(emptyList())
        }
    }

    suspend fun applyReferral(code: String): Result<Unit> {
        return try {
            val res = apiService.applyReferral(ApplyReferralRequest(code))
            if (res.isSuccessful) Result.success(Unit) else Result.failure(Exception("Failed to apply code"))
        } catch (e: Exception) {
            Result.success(Unit)
        }
    }
}

