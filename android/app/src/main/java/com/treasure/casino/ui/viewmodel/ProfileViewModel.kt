package com.treasure.casino.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.treasure.casino.data.model.User
import com.treasure.casino.data.model.UserProfile
import com.treasure.casino.data.model.Wallet
import com.treasure.casino.data.repository.UserRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProfileUiState(
    val user: User = User("u-1", "player@treasure.casino", "+919876543210", "Royal Player", null, "PLAYER", "ACTIVE", 2),
    val wallet: Wallet = Wallet("w-1", "u-1", 10000.0),
    val profile: UserProfile? = null
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val userRepository: UserRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    init {
        loadProfile()
    }

    fun loadProfile() {
        viewModelScope.launch {
            val res = userRepository.getUserProfile()
            res.onSuccess {
                _uiState.value = ProfileUiState(
                    user = it.user,
                    wallet = it.wallet,
                    profile = it
                )
            }
        }
    }
}

