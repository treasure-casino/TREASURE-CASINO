package com.treasure.casino.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.navArgument
import com.treasure.casino.ui.components.BottomNavBar
import com.treasure.casino.ui.screens.auth.LoginScreen
import com.treasure.casino.ui.screens.auth.RegisterScreen
import com.treasure.casino.ui.screens.games.GameDetailScreen
import com.treasure.casino.ui.screens.games.GameLobbyScreen
import com.treasure.casino.ui.screens.games.GamePlayScreen
import com.treasure.casino.ui.screens.home.HomeScreen
import com.treasure.casino.ui.screens.profile.ProfileScreen
import com.treasure.casino.ui.screens.referral.ReferralScreen
import com.treasure.casino.ui.screens.rewards.RewardsScreen
import com.treasure.casino.ui.screens.splash.SplashScreen
import com.treasure.casino.ui.screens.support.SupportScreen
import com.treasure.casino.ui.screens.wallet.DepositScreen
import com.treasure.casino.ui.screens.wallet.WalletScreen
import com.treasure.casino.ui.screens.wallet.WithdrawScreen
import com.treasure.casino.ui.viewmodel.*

@Composable
fun NavGraph(
    navController: NavHostController,
    modifier: Modifier = Modifier
) {
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val bottomNavRoutes = listOf(
        Screen.Home.route,
        Screen.Referral.route,
        Screen.Deposit.route,
        Screen.Rewards.route,
        Screen.Profile.route
    )
    val showBottomBar = currentRoute in bottomNavRoutes

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                BottomNavBar(
                    currentRoute = currentRoute,
                    onNavigate = { route ->
                        navController.navigate(route) {
                            popUpTo(Screen.Home.route) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                )
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Splash.route,
            modifier = modifier.padding(innerPadding)
        ) {
            composable(Screen.Splash.route) {
                SplashScreen(
                    onNavigateNext = {
                        navController.navigate(Screen.Home.route) {
                            popUpTo(Screen.Splash.route) { inclusive = true }
                        }
                    }
                )
            }

            composable(Screen.Login.route) {
                LoginScreen(
                    onLoginSuccess = {
                        navController.navigate(Screen.Home.route) {
                            popUpTo(Screen.Login.route) { inclusive = true }
                        }
                    },
                    onNavigateRegister = { navController.navigate(Screen.Register.route) },
                    onNavigateForgot = { navController.navigate(Screen.Login.route) }
                )
            }

            composable(Screen.Register.route) {
                RegisterScreen(
                    onRegisterSuccess = {
                        navController.navigate(Screen.Home.route) {
                            popUpTo(Screen.Register.route) { inclusive = true }
                        }
                    },
                    onNavigateLogin = { navController.navigate(Screen.Login.route) }
                )
            }

            composable(Screen.Home.route) {
                val homeViewModel: HomeViewModel = hiltViewModel()
                HomeScreen(
                    viewModel = homeViewModel,
                    onNavigateGame = { gameId ->
                        navController.navigate(Screen.GameDetail.createRoute(gameId))
                    },
                    onNavigateWallet = { navController.navigate(Screen.Wallet.route) },
                    onNavigateNotifications = { navController.navigate(Screen.Home.route) }
                )
            }

            composable(Screen.GameLobby.route) {
                val gameViewModel: GameViewModel = hiltViewModel()
                GameLobbyScreen(
                    viewModel = gameViewModel,
                    onNavigateGame = { gameId ->
                        navController.navigate(Screen.GameDetail.createRoute(gameId))
                    }
                )
            }

            composable(
                route = Screen.GameDetail.route,
                arguments = listOf(navArgument("gameId") { type = NavType.StringType })
            ) { backStackEntry ->
                val gameId = backStackEntry.arguments?.getString("gameId") ?: "game-hotline-01"
                val gameViewModel: GameViewModel = hiltViewModel()
                GameDetailScreen(
                    gameId = gameId,
                    viewModel = gameViewModel,
                    onBack = { navController.popBackStack() },
                    onPlay = { id -> navController.navigate(Screen.GamePlay.createRoute(id)) }
                )
            }

            composable(
                route = Screen.GamePlay.route,
                arguments = listOf(navArgument("gameId") { type = NavType.StringType })
            ) { backStackEntry ->
                val gameId = backStackEntry.arguments?.getString("gameId") ?: "game-hotline-01"
                GamePlayScreen(
                    gameId = gameId,
                    onBack = { navController.popBackStack() }
                )
            }

            composable(Screen.Wallet.route) {
                val walletViewModel: WalletViewModel = hiltViewModel()
                WalletScreen(
                    viewModel = walletViewModel,
                    onNavigateDeposit = { navController.navigate(Screen.Deposit.route) },
                    onNavigateWithdraw = { navController.navigate(Screen.Withdraw.route) },
                    onNavigateHistory = { navController.navigate(Screen.Wallet.route) }
                )
            }

            composable(Screen.Deposit.route) {
                val walletViewModel: WalletViewModel = hiltViewModel()
                DepositScreen(
                    viewModel = walletViewModel,
                    onBack = { navController.popBackStack() }
                )
            }

            composable(Screen.Withdraw.route) {
                val walletViewModel: WalletViewModel = hiltViewModel()
                WithdrawScreen(
                    viewModel = walletViewModel,
                    onBack = { navController.popBackStack() }
                )
            }

            composable(Screen.Rewards.route) {
                val rewardViewModel: RewardViewModel = hiltViewModel()
                RewardsScreen(viewModel = rewardViewModel)
            }

            composable(Screen.Referral.route) {
                val referralViewModel: ReferralViewModel = hiltViewModel()
                ReferralScreen(viewModel = referralViewModel)
            }

            composable(Screen.Profile.route) {
                val profileViewModel: ProfileViewModel = hiltViewModel()
                ProfileScreen(
                    viewModel = profileViewModel,
                    onLogout = {
                        navController.navigate(Screen.Login.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    }
                )
            }

            composable(Screen.Support.route) {
                val supportViewModel: SupportViewModel = hiltViewModel()
                SupportScreen(viewModel = supportViewModel)
            }
        }
    }
}

