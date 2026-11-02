package com.treasure.casino.navigation

sealed class Screen(val route: String) {
    object Splash : Screen("splash")
    object Login : Screen("login")
    object Register : Screen("register")
    object ForgotPassword : Screen("forgot_password")

    object Home : Screen("home")
    object GameLobby : Screen("game_lobby")
    object GameDetail : Screen("game_detail/{gameId}") {
        fun createRoute(gameId: String) = "game_detail/$gameId"
    }
    object GamePlay : Screen("game_play/{gameId}") {
        fun createRoute(gameId: String) = "game_play/$gameId"
    }

    object Wallet : Screen("wallet")
    object Deposit : Screen("deposit")
    object Withdraw : Screen("withdraw")
    object TransactionHistory : Screen("transaction_history")

    object Rewards : Screen("rewards")
    object VipStatus : Screen("vip_status")

    object Referral : Screen("referral")

    object Profile : Screen("profile")
    object EditProfile : Screen("edit_profile")
    object SecuritySettings : Screen("security_settings")

    object Support : Screen("support")
    object CreateTicket : Screen("create_ticket")
    object TicketDetail : Screen("ticket_detail/{ticketId}") {
        fun createRoute(ticketId: String) = "ticket_detail/$ticketId"
    }

    object Notifications : Screen("notifications")
}

