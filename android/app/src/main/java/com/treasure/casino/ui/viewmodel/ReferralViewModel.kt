package com.treasure.casino.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.treasure.casino.data.model.ReferralRecord
import com.treasure.casino.data.model.ReferralStats
import com.treasure.casino.data.repository.ReferralRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ReferralUiState(
    val stats: ReferralStats = ReferralStats("TREASURE777"),
    val history: List<ReferralRecord> = emptyList(),
    val message: String? = null
)

@HiltViewModel
class ReferralViewModel @Inject constructor(
    private val referralRepository: ReferralRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ReferralUiState())
    val uiState: StateFlow<ReferralUiState> = _uiState.asStateFlow()

    init {
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            val statsRes = referralRepository.getStats()
            val historyRes = referralRepository.getHistory()
            _uiState.value = ReferralUiState(
                stats = statsRes.getOrDefault(ReferralStats("TREASURE777")),
                history = historyRes.getOrDefault(emptyList())
            )
        }
    }

    fun applyReferral(code: String) {
        viewModelScope.launch {
            referralRepository.applyReferral(code)
            _uiState.value = _uiState.value.copy(message = "Referral code applied successfully!")
        }
    }
}

