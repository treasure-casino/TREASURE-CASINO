package com.treasure.casino.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.treasure.casino.data.model.SupportTicket
import com.treasure.casino.data.repository.SupportRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SupportUiState(
    val isLoading: Boolean = false,
    val tickets: List<SupportTicket> = emptyList(),
    val message: String? = null
)

@HiltViewModel
class SupportViewModel @Inject constructor(
    private val supportRepository: SupportRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(SupportUiState(isLoading = true))
    val uiState: StateFlow<SupportUiState> = _uiState.asStateFlow()

    init {
        loadTickets()
    }

    fun loadTickets() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            val res = supportRepository.getTickets()
            _uiState.value = SupportUiState(
                isLoading = false,
                tickets = res.getOrDefault(emptyList())
            )
        }
    }

    fun createTicket(subject: String, category: String, message: String) {
        viewModelScope.launch {
            val res = supportRepository.createTicket(subject, category, message)
            res.onSuccess {
                loadTickets()
                _uiState.value = _uiState.value.copy(message = "Support ticket submitted successfully")
            }
        }
    }

    fun replyTicket(id: String, msg: String) {
        viewModelScope.launch {
            val res = supportRepository.replyTicket(id, msg)
            res.onSuccess {
                loadTickets()
            }
        }
    }
}

