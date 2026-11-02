package com.treasure.casino.data.repository

import com.treasure.casino.data.local.TokenManager
import com.treasure.casino.data.model.*
import com.treasure.casino.data.remote.ApiService
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val apiService: ApiService,
    private val tokenManager: TokenManager
) {
    val authToken: Flow<String?> = tokenManager.tokenFlow

    suspend fun login(email: String, pass: String): Result<AuthResponse> {
        return try {
            val res = apiService.login(LoginRequest(email, pass))
            if (res.isSuccessful && res.body()?.success == true && res.body()?.data != null) {
                val data = res.body()!!.data!!
                tokenManager.saveTokens(data.token, data.refreshToken, data.user.id)
                Result.success(data)
            } else {
                Result.failure(Exception(res.body()?.message ?: "Login failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun register(email: String, phone: String?, pass: String, name: String, refCode: String?): Result<AuthResponse> {
        return try {
            val res = apiService.register(RegisterRequest(email, phone, pass, name, refCode))
            if (res.isSuccessful && res.body()?.success == true && res.body()?.data != null) {
                val data = res.body()!!.data!!
                tokenManager.saveTokens(data.token, data.refreshToken, data.user.id)
                Result.success(data)
            } else {
                Result.failure(Exception(res.body()?.message ?: "Registration failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun logout() {
        tokenManager.clearTokens()
    }
}

