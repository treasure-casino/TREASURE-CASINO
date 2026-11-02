package com.treasure.casino.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.treasure.casino.data.model.Game
import com.treasure.casino.data.model.GamePlayResponse
import com.treasure.casino.data.repository.GameRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class GameLobbyUiState(
    val isLoading: Boolean = false,
    val games: List<Game> = emptyList(),
    val searchQuery: String = "",
    val activeCategory: String = "ALL",
    val errorMessage: String? = null
)

@HiltViewModel
class GameViewModel @Inject constructor(
    private val gameRepository: GameRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(GameLobbyUiState(isLoading = true))
    val uiState: StateFlow<GameLobbyUiState> = _uiState.asStateFlow()

    private val _activeGame = MutableStateFlow<Game?>(null)
    val activeGame: StateFlow<Game?> = _activeGame.asStateFlow()

    private val _gamePlayResult = MutableStateFlow<GamePlayResponse?>(null)
    val gamePlayResult: StateFlow<GamePlayResponse?> = _gamePlayResult.asStateFlow()

    init {
        loadGames()
    }

    fun loadGames(category: String? = null, query: String? = null) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            val res = gameRepository.getGames(category, query)
            _uiState.value = GameLobbyUiState(
                isLoading = false,
                games = res.getOrDefault(emptyList()),
                activeCategory = category ?: "ALL",
                searchQuery = query ?: ""
            )
        }
    }

    fun loadGameDetail(gameId: String) {
        viewModelScope.launch {
            val res = gameRepository.getGameById(gameId)
            _activeGame.value = res.getOrNull()
        }
    }

    fun playGame(gameId: String, betAmount: Double, actionData: Map<String, Any>? = null) {
        viewModelScope.launch {
            val res = gameRepository.playGame(gameId, betAmount, actionData)
            _gamePlayResult.value = res.getOrNull()
        }
    }
}

