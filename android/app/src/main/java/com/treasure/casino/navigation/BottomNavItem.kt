package com.treasure.casino.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.ui.graphics.vector.ImageVector

sealed class BottomNavItem(
    val route: String,
    val title: String,
    val icon: ImageVector
) {
    object Home : BottomNavItem(Screen.Home.route, "Home", Icons.Default.Home)
    object Invite : BottomNavItem(Screen.Referral.route, "Invite", Icons.Default.Share)
    object Deposit : BottomNavItem(Screen.Deposit.route, "Deposit", Icons.Default.AccountBalanceWallet)
    object Rewards : BottomNavItem(Screen.Rewards.route, "Rewards", Icons.Default.CardGiftcard)
    object Member : BottomNavItem(Screen.Profile.route, "Member", Icons.Default.Person)

    companion object {
        val items = listOf(Home, Invite, Deposit, Rewards, Member)
    }
}

