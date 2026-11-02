package com.treasure.casino.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.treasure.casino.data.model.Reward
import com.treasure.casino.data.model.VipStatus
import com.treasure.casino.data.repository.RewardRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class RewardUiState(
    val isLoading: Boolean = false,
    val rewards: List<Reward> = emptyList(),
    val vipStatus: VipStatus = VipStatus(),
    val message: String? = null
)

@HiltViewModel
class RewardViewModel @Inject constructor(
    private val rewardRepository: RewardRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(RewardUiState(isLoading = true))
    val uiState: StateFlow<RewardUiState> = _uiState.asStateFlow()

    init {
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            val rewRes = rewardRepository.getRewards()
            val vipRes = rewardRepository.getVipStatus()
            _uiState.value = RewardUiState(
                isLoading = false,
                rewards = rewRes.getOrDefault(emptyList()),
                vipStatus = vipRes.getOrDefault(VipStatus())
            )
        }
    }

    fun claimReward(id: String) {
        viewModelScope.launch {
            val res = rewardRepository.claimReward(id)
            res.onSuccess {
                loadData()
                _uiState.value = _uiState.value.copy(message = "Claimed ₹${it.bonusAmount} reward bonus!")
            }
        }
    }

    fun applyCoupon(code: String) {
        viewModelScope.launch {
            val res = rewardRepository.applyCoupon(code)
            res.onSuccess {
                loadData()
                _uiState.value = _uiState.value.copy(message = "Bonus code applied: +₹${it.bonusAmount}")
            }
        }
    }
}

