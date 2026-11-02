package com.treasure.casino.ui.screens.games

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.treasure.casino.ui.components.TreasureTextField
import com.treasure.casino.ui.screens.home.components.CategoryChip
import com.treasure.casino.ui.screens.home.components.GameCard
import com.treasure.casino.ui.theme.BgPrimary
import com.treasure.casino.ui.theme.GoldLight
import com.treasure.casino.ui.viewmodel.GameViewModel

@Composable
fun GameLobbyScreen(
    viewModel: GameViewModel,
    onNavigateGame: (String) -> Unit
) {
    val state by viewModel.uiState.collectAsState()
    val categories = listOf("ALL", "SLOTS", "CRASH", "MINES", "CARDS", "CASUAL")

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BgPrimary)
            .statusBarsPadding()
            .padding(16.dp)
    ) {
        Text(
            text = "GAME LOBBY",
            color = GoldLight,
            fontSize = 20.sp,
            fontWeight = FontWeight.Black,
            letterSpacing = 2.sp
        )

        Spacer(modifier = Modifier.height(14.dp))

        TreasureTextField(
            value = state.searchQuery,
            onValueChange = { viewModel.loadGames(state.activeCategory, it) },
            label = "Search all 55+ original games..."
        )

        Spacer(modifier = Modifier.height(14.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            categories.take(4).forEach { cat ->
                CategoryChip(
                    title = cat,
                    isSelected = state.activeCategory == cat,
                    onClick = { viewModel.loadGames(cat, state.searchQuery) }
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 80.dp)
        ) {
            items(state.games) { game ->
                GameCard(
                    game = game,
                    onClick = { onNavigateGame(game.id) },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
    }
}

