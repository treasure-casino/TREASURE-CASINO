package com.treasure.casino.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.treasure.casino.data.model.Wallet
import com.treasure.casino.data.model.WalletTransaction
import com.treasure.casino.data.repository.WalletRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class WalletUiState(
    val isLoading: Boolean = false,
    val wallet: Wallet? = null,
    val transactions: List<WalletTransaction> = emptyList(),
    val actionSuccessMessage: String? = null,
    val errorMessage: String? = null
)

@HiltViewModel
class WalletViewModel @Inject constructor(
    private val walletRepository: WalletRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(WalletUiState(isLoading = true))
    val uiState: StateFlow<WalletUiState> = _uiState.asStateFlow()

    init {
        loadWallet()
    }

    fun loadWallet() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            val wRes = walletRepository.getWallet()
            val tRes = walletRepository.getTransactions()

            _uiState.value = WalletUiState(
                isLoading = false,
                wallet = wRes.getOrDefault(Wallet("demo", "demo", 10000.0)),
                transactions = tRes.getOrDefault(emptyList())
            )
        }
    }

    fun deposit(amount: Double) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            val res = walletRepository.deposit(amount)
            res.onSuccess {
                loadWallet()
                _uiState.value = _uiState.value.copy(actionSuccessMessage = "Successfully added ₹$amount to demo wallet")
            }.onFailure {
                _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = it.message)
            }
        }
    }

    fun withdraw(amount: Double, holder: String, acc: String, ifsc: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            val res = walletRepository.withdraw(amount, holder, acc, ifsc)
            res.onSuccess {
                loadWallet()
                _uiState.value = _uiState.value.copy(actionSuccessMessage = "Simulated withdrawal request submitted for ₹$amount")
            }.onFailure {
                _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = it.message)
            }
        }
    }
}

