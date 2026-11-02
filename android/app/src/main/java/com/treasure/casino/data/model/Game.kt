package com.treasure.casino.data.model

data class Game(
    val id: String,
    val name: String,
    val category: String, // SLOTS, CRASH, MINES, CARDS, CASUAL
    val description: String? = null,
    val thumbnailUrl: String? = null,
    val minBet: Double = 10.0,
    val maxBet: Double = 5000.0,
    val rtp: Double = 96.0,
    val isPopular: Boolean = false,
    val isFavorite: Boolean = false,
    val providerId: String? = null
)

data class GameCategory(
    val id: String,
    val name: String,
    val icon: String? = null
)

data class GameSession(
    val sessionId: String,
    val gameId: String,
    val initialBalance: Double,
    val startedAt: String
)

data class GamePlayRequest(
    val gameId: String,
    val betAmount: Double,
    val actionData: Map<String, Any>? = null
)

data class GamePlayResponse(
    val success: Boolean,
    val winAmount: Double,
    val multiplier: Double,
    val balanceAfter: Double,
    val resultData: Map<String, Any>? = null
)

