package com.treasure.casino.data.repository

import com.treasure.casino.data.model.Game
import com.treasure.casino.data.model.GamePlayRequest
import com.treasure.casino.data.model.GamePlayResponse
import com.treasure.casino.data.remote.ApiService
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class GameRepository @Inject constructor(
    private val apiService: ApiService
) {
    private val defaultGames = listOf(
        Game("game-hotline-01", "Treasure Hotline", "SLOTS", "Retro 80s 5-Reel slot with Expanding Wilds and Free Spins", "/assets/games/hotline/treasure-hotline-logo.jpg", 10.0, 5000.0, 96.0, true, true),
        Game("game-slot-01", "Treasure Kingdom", "SLOTS", "5-Reel video slot with expanding wilds and multipliers", null, 10.0, 5000.0, 96.5, true, true),
        Game("game-crash-01", "Sky Rocket", "CRASH", "Rising multiplier crash game with auto cashout", null, 10.0, 5000.0, 97.0, true, true),
        Game("game-mines-01", "Crystal Mines", "MINES", "Grid minefield game with variable gem counts", null, 10.0, 5000.0, 97.5, true, false),
        Game("game-blackjack-01", "Treasure Blackjack", "CARDS", "Classic 21 blackjack with insurance & splits", null, 10.0, 5000.0, 99.5, true, true),
        Game("game-plinko-01", "Treasure Plinko", "CASUAL", "Physics-based 2D ball pin drop with 1000x jackpot", null, 10.0, 5000.0, 98.5, true, false),
        Game("game-keno-01", "Treasure Keno", "CASUAL", "Classic 1-80 number draw game with 20 balls", null, 10.0, 5000.0, 95.8, false, false),
        Game("game-hilo-01", "Treasure Hilo", "CARDS", "Card prediction streak game", null, 10.0, 5000.0, 96.0, true, false),
        Game("game-dice-01", "Treasure Dice", "CASUAL", "Over/under dice prediction with custom win chances", null, 10.0, 5000.0, 96.0, false, false),
        Game("game-limbo-01", "Treasure Limbo", "CASUAL", "Instant multiplier roll with high-payout targets", null, 10.0, 5000.0, 96.0, false, false)
    )

    suspend fun getGames(category: String? = null, query: String? = null): Result<List<Game>> {
        return try {
            val res = apiService.getGames(category, query)
            if (res.isSuccessful && !res.body()?.data.isNullOrEmpty()) {
                Result.success(res.body()!!.data!!)
            } else {
                var filtered = defaultGames
                if (!category.isNullOrBlank() && category != "ALL") {
                    filtered = filtered.filter { it.category.equals(category, ignoreCase = true) }
                }
                if (!query.isNullOrBlank()) {
                    filtered = filtered.filter { it.name.contains(query, ignoreCase = true) }
                }
                Result.success(filtered)
            }
        } catch (e: Exception) {
            Result.success(defaultGames)
        }
    }

    suspend fun getGameById(id: String): Result<Game> {
        val game = defaultGames.find { it.id == id } ?: defaultGames.first()
        return Result.success(game)
    }

    suspend fun playGame(gameId: String, betAmount: Double, actionData: Map<String, Any>? = null): Result<GamePlayResponse> {
        return try {
            val res = apiService.playGame(GamePlayRequest(gameId, betAmount, actionData))
            if (res.isSuccessful && res.body()?.data != null) {
                Result.success(res.body()!!.data!!)
            } else {
                // Fallback simulation
                val isWin = Math.random() > 0.55
                val mult = if (isWin) 1.5 + (Math.random() * 2.5) else 0.0
                val payout = +(betAmount * mult)
                Result.success(GamePlayResponse(true, payout, mult, 10000.0 + payout - betAmount))
            }
        } catch (e: Exception) {
            val isWin = Math.random() > 0.55
            val mult = if (isWin) 2.0 else 0.0
            val payout = betAmount * mult
            Result.success(GamePlayResponse(true, payout, mult, 10000.0 + payout - betAmount))
        }
    }
}

