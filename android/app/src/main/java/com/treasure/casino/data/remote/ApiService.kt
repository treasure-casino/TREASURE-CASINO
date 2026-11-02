package com.treasure.casino.data.remote

import com.treasure.casino.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    // Auth
    @POST("/api/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<ApiResponse<AuthResponse>>

    @POST("/api/auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<ApiResponse<AuthResponse>>

    @POST("/api/auth/forgot-password")
    suspend fun forgotPassword(@Body request: ForgotPasswordRequest): Response<ApiResponse<Unit>>

    @POST("/api/auth/reset-password")
    suspend fun resetPassword(@Body request: ResetPasswordRequest): Response<ApiResponse<Unit>>

    @GET("/api/auth/me")
    suspend fun getCurrentUser(): Response<ApiResponse<User>>

    // User Profile
    @GET("/api/users/profile")
    suspend fun getUserProfile(): Response<ApiResponse<UserProfile>>

    // Wallet
    @GET("/api/wallet")
    suspend fun getWallet(): Response<ApiResponse<Wallet>>

    @GET("/api/wallet/transactions")
    suspend fun getWalletTransactions(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("type") type: String? = null
    ): Response<ApiResponse<List<WalletTransaction>>>

    @POST("/api/wallet/deposit")
    suspend fun deposit(@Body request: DepositRequest): Response<ApiResponse<WalletTransaction>>

    @POST("/api/wallet/withdraw")
    suspend fun withdraw(@Body request: WithdrawRequest): Response<ApiResponse<WalletTransaction>>

    // Games
    @GET("/api/games")
    suspend fun getGames(
        @Query("category") category: String? = null,
        @Query("search") search: String? = null
    ): Response<ApiResponse<List<Game>>>

    @GET("/api/games/{id}")
    suspend fun getGameById(@Path("id") id: String): Response<ApiResponse<Game>>

    @POST("/api/games/play")
    suspend fun playGame(@Body request: GamePlayRequest): Response<ApiResponse<GamePlayResponse>>

    // Rewards & VIP
    @GET("/api/rewards")
    suspend fun getRewards(): Response<ApiResponse<List<Reward>>>

    @POST("/api/rewards/{id}/claim")
    suspend fun claimReward(@Path("id") id: String): Response<ApiResponse<Reward>>

    @GET("/api/rewards/vip-status")
    suspend fun getVipStatus(): Response<ApiResponse<VipStatus>>

    @POST("/api/rewards/apply-coupon")
    suspend fun applyCoupon(@Body request: CouponApplyRequest): Response<ApiResponse<Reward>>

    // Referral
    @GET("/api/referrals/stats")
    suspend fun getReferralStats(): Response<ApiResponse<ReferralStats>>

    @GET("/api/referrals/history")
    suspend fun getReferralHistory(): Response<ApiResponse<List<ReferralRecord>>>

    @POST("/api/referrals/apply")
    suspend fun applyReferral(@Body request: ApplyReferralRequest): Response<ApiResponse<Unit>>

    // Support
    @GET("/api/support/tickets")
    suspend fun getTickets(): Response<ApiResponse<List<SupportTicket>>>

    @GET("/api/support/tickets/{id}")
    suspend fun getTicketById(@Path("id") id: String): Response<ApiResponse<SupportTicket>>

    @POST("/api/support/tickets")
    suspend fun createTicket(@Body request: CreateTicketRequest): Response<ApiResponse<SupportTicket>>

    @POST("/api/support/tickets/{id}/reply")
    suspend fun replyTicket(
        @Path("id") id: String,
        @Body request: ReplyTicketRequest
    ): Response<ApiResponse<SupportTicket>>

    // Notifications
    @GET("/api/notifications")
    suspend fun getNotifications(): Response<ApiResponse<List<Notification>>>

    @POST("/api/notifications/{id}/read")
    suspend fun markNotificationRead(@Path("id") id: String): Response<ApiResponse<Unit>>
}

