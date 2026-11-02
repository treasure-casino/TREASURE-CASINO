package com.treasure.casino.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.treasure.casino.data.model.User
import com.treasure.casino.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class AuthUiState {
    object Idle : AuthUiState()
    object Loading : AuthUiState()
    data class Authenticated(val user: User) : AuthUiState()
    data class Error(val message: String) : AuthUiState()
}

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<AuthUiState>(AuthUiState.Idle)
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    fun login(email: String, pass: String) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            val res = authRepository.login(email, pass)
            res.onSuccess {
                _uiState.value = AuthUiState.Authenticated(it.user)
            }.onFailure {
                _uiState.value = AuthUiState.Error(it.message ?: "Authentication failed")
            }
        }
    }

    fun register(email: String, phone: String?, pass: String, name: String, refCode: String?) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            val res = authRepository.register(email, phone, pass, name, refCode)
            res.onSuccess {
                _uiState.value = AuthUiState.Authenticated(it.user)
            }.onFailure {
                _uiState.value = AuthUiState.Error(it.message ?: "Registration failed")
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
            _uiState.value = AuthUiState.Idle
        }
    }
}

