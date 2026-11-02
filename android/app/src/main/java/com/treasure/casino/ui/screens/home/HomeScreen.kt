package com.treasure.casino.ui.screens.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.treasure.casino.ui.components.TopBar
import com.treasure.casino.ui.screens.home.components.BannerCarousel
import com.treasure.casino.ui.screens.home.components.CategoryChip
import com.treasure.casino.ui.screens.home.components.GameCard
import com.treasure.casino.ui.theme.BgPrimary
import com.treasure.casino.ui.theme.GoldLight
import com.treasure.casino.ui.theme.TextPrimary
import com.treasure.casino.ui.viewmodel.HomeViewModel

@Composable
fun HomeScreen(
    viewModel: HomeViewModel,
    onNavigateGame: (String) -> Unit,
    onNavigateWallet: () -> Unit,
    onNavigateNotifications: () -> Unit
) {
    val state by viewModel.uiState.collectAsState()
    val categories = listOf("ALL", "SLOTS", "CRASH", "MINES", "CARDS", "CASUAL")

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BgPrimary)
    ) {
        TopBar(
            balance = state.wallet?.balance ?: 10000.0,
            onWalletClick = onNavigateWallet,
            onNotificationClick = onNavigateNotifications
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(bottom = 80.dp)
        ) {
            // Promo Banner
            BannerCarousel(modifier = Modifier.padding(16.dp))

            // Categories Row
            LazyRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(categories) { cat ->
                    CategoryChip(
                        title = cat,
                        isSelected = state.selectedCategory == cat,
                        onClick = { viewModel.selectCategory(cat) }
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Popular Games Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "POPULAR GAMES",
                    color = GoldLight,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 1.sp
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Popular Games Horizontal Scroll
            LazyRow(
                modifier = Modifier.fillMaxWidth(),
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(state.popularGames) { game ->
                    GameCard(
                        game = game,
                        onClick = { onNavigateGame(game.id) }
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Recently Played Header
            Text(
                text = "RECENTLY PLAYED",
                color = TextPrimary,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp,
                modifier = Modifier.padding(horizontal = 16.dp)
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Recent Games
            LazyRow(
                modifier = Modifier.fillMaxWidth(),
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(state.recentGames) { game ->
                    GameCard(
                        game = game,
                        onClick = { onNavigateGame(game.id) }
                    )
                }
            }
        }
    }
}

