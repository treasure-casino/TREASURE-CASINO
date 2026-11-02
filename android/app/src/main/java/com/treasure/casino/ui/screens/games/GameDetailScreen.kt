package com.treasure.casino.ui.screens.games

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.treasure.casino.ui.components.GoldButton
import com.treasure.casino.ui.components.TreasureCard
import com.treasure.casino.ui.theme.*
import com.treasure.casino.ui.viewmodel.GameViewModel

@Composable
fun GameDetailScreen(
    gameId: String,
    viewModel: GameViewModel,
    onBack: () -> Unit,
    onPlay: (String) -> Unit
) {
    LaunchedEffect(gameId) {
        viewModel.loadGameDetail(gameId)
    }

    val game by viewModel.activeGame.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BgPrimary)
            .statusBarsPadding()
            .padding(16.dp),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Column {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                IconButton(onClick = onBack) {
                    Icon(
                        imageVector = Icons.Default.ArrowBack,
                        contentDescription = "Back",
                        tint = GoldPrimary
                    )
                }
                Text(
                    text = game?.name ?: "Game Overview",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Game Hero Banner
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .background(BgSurfaceElevated)
                    .border(1.5.dp, GoldPrimary, RoundedCornerShape(20.dp)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = when (game?.category) {
                        "SLOTS" -> "🎰"
                        "CRASH" -> "🚀"
                        "MINES" -> "💎"
                        "CARDS" -> "🃏"
                        else -> "🎲"
                    },
                    fontSize = 64.sp
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            TreasureCard {
                Text(
                    text = game?.name ?: "",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Black,
                    color = GoldLight
                )
                Text(
                    text = game?.description ?: "Certified Provably Fair RNG Simulation Game",
                    fontSize = 13.sp,
                    color = TextMuted,
                    modifier = Modifier.padding(vertical = 8.dp)
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text("Category", fontSize = 11.sp, color = TextMuted)
                        Text(game?.category ?: "", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    }
                    Column {
                        Text("RTP", fontSize = 11.sp, color = TextMuted)
                        Text("${game?.rtp ?: 96.0}%", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = AccentGreen)
                    }
                    Column {
                        Text("Min/Max Bet", fontSize = 11.sp, color = TextMuted)
                        Text("₹${game?.minBet?.toInt()} - ₹${game?.maxBet?.toInt()}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = GoldLight)
                    }
                }
            }
        }

        GoldButton(
            text = "PLAY DEMO ROUND",
            onClick = { onPlay(gameId) }
        )
    }
}

