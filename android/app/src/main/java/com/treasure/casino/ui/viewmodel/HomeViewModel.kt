package com.treasure.casino.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.treasure.casino.data.model.Game
import com.treasure.casino.data.model.Wallet
import com.treasure.casino.data.repository.GameRepository
import com.treasure.casino.data.repository.WalletRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HomeUiState(
    val isLoading: Boolean = false,
    val wallet: Wallet? = null,
    val popularGames: List<Game> = emptyList(),
    val recentGames: List<Game> = emptyList(),
    val selectedCategory: String = "ALL",
    val errorMessage: String? = null
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val gameRepository: GameRepository,
    private val walletRepository: WalletRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState(isLoading = true))
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        loadHomeData()
    }

    fun loadHomeData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)

            val gamesRes = gameRepository.getGames()
            val walletRes = walletRepository.getWallet()

            val games = gamesRes.getOrDefault(emptyList())
            val wallet = walletRes.getOrDefault(Wallet("demo", "demo", 10000.0))

            _uiState.value = HomeUiState(
                isLoading = false,
                wallet = wallet,
                popularGames = games.filter { it.isPopular },
                recentGames = games.take(4),
                selectedCategory = "ALL",
                errorMessage = null
            )
        }
    }

    fun selectCategory(cat: String) {
        viewModelScope.launch {
            val gamesRes = gameRepository.getGames(category = if (cat == "ALL") null else cat)
            _uiState.value = _uiState.value.copy(
                selectedCategory = cat,
                popularGames = gamesRes.getOrDefault(emptyList())
            )
        }
    }
}

