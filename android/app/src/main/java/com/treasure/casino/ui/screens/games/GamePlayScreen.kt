package com.treasure.casino.ui.screens.games

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.treasure.casino.ui.components.GoldButton
import com.treasure.casino.ui.theme.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun GamePlayScreen(
    gameId: String,
    onBack: () -> Unit
) {
    val coroutineScope = rememberCoroutineScope()

    var demoBalance by remember { mutableStateOf(10000.0) }
    var betAmount by remember { mutableStateOf(50.0) }
    var isSpinning by remember { mutableStateOf(false) }
    var resultMessage by remember { mutableStateOf("PRESS SPIN TO START ROUND") }
    var lastWin by remember { mutableStateOf(0.0) }

    // Slot Reels
    val slotSymbols = listOf("🍒", "🍋", "🔔", "⭐", "7️⃣", "💎", "🃏")
    var reel1 by remember { mutableStateOf("7️⃣") }
    var reel2 by remember { mutableStateOf("⭐") }
    var reel3 by remember { mutableStateOf("7️⃣") }

    fun executeSpin() {
        if (isSpinning || demoBalance < betAmount) return
        isSpinning = true
        demoBalance -= betAmount
        resultMessage = "REELS ACCELERATING..."

        coroutineScope.launch {
            // Spin animation
            repeat(10) {
                reel1 = slotSymbols.random()
                reel2 = slotSymbols.random()
                reel3 = slotSymbols.random()
                delay(70)
            }

            // Decide result (PRD calibrated win rate ~40%)
            val isWin = Math.random() < 0.42
            if (isWin) {
                val winningSymbol = slotSymbols.random()
                val isBigWin = Math.random() < 0.25
                if (isBigWin) {
                    reel1 = winningSymbol
                    reel2 = winningSymbol
                    reel3 = winningSymbol
                    val payout = betAmount * 15.0
                    lastWin = payout
                    demoBalance += payout
                    resultMessage = "🔥 BIG WIN! +₹${payout.toInt()} (15x)"
                } else {
                    reel1 = winningSymbol
                    reel2 = winningSymbol
                    reel3 = slotSymbols.filter { it != winningSymbol }.random()
                    val payout = betAmount * 3.0
                    lastWin = payout
                    demoBalance += payout
                    resultMessage = "WINNER! +₹${payout.toInt()} (3x)"
                }
            } else {
                reel1 = slotSymbols.random()
                reel2 = slotSymbols.filter { it != reel1 }.random()
                reel3 = slotSymbols.filter { it != reel2 }.random()
                lastWin = 0.0
                resultMessage = "NO WIN — TRY AGAIN"
            }
            isSpinning = false
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BgPrimary)
            .statusBarsPadding()
            .padding(16.dp),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        // Top Bar
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = GoldPrimary)
            }

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = if (gameId.contains("hotline")) "TREASURE HOTLINE" else "TREASURE SLOTS",
                    color = GoldLight,
                    fontWeight = FontWeight.Black,
                    fontSize = 15.sp,
                    letterSpacing = 1.sp
                )
                Text(
                    text = "SIMULATED DEMO MODE",
                    color = TextMuted,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            Row(
                modifier = Modifier
                    .background(BgSurfaceElevated, RoundedCornerShape(16.dp))
                    .border(1.dp, GoldPrimary, RoundedCornerShape(16.dp))
                    .padding(horizontal = 10.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("₹", color = GoldLight, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                Spacer(modifier = Modifier.width(2.dp))
                Text(String.format("%,.0f", demoBalance), color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 12.sp)
            }
        }

        // Slot Arena Box
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(260.dp)
                .clip(RoundedCornerShape(24.dp))
                .background(BgSurface)
                .border(2.dp, GoldPrimary, RoundedCornerShape(24.dp))
                .padding(16.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                // Reels Container
                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    listOf(reel1, reel2, reel3).forEach { sym ->
                        Box(
                            modifier = Modifier
                                .size(85.dp)
                                .clip(RoundedCornerShape(16.dp))
                            .background(BgPrimary)
                            .border(1.5.dp, GoldSubtle, RoundedCornerShape(16.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(text = sym, fontSize = 42.sp)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Result Message Banner
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(BgPrimary.copy(alpha = 0.8f), RoundedCornerShape(12.dp))
                        .border(1.dp, if (lastWin > 0) AccentGreen else Color(0x33FFFFFF), RoundedCornerShape(12.dp))
                        .padding(vertical = 8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = resultMessage,
                        color = if (lastWin > 0) GoldLight else TextMuted,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        // Betting & Action Controls Console
        Column(
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Bet Selector Chips
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("BET AMOUNT", color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(10.0, 50.0, 100.0, 500.0).forEach { amt ->
                        val isSelected = betAmount == amt
                        Button(
                            onClick = { betAmount = amt },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (isSelected) GoldPrimary else BgSurfaceElevated
                            ),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.height(32.dp)
                        ) {
                            Text(
                                text = "₹${amt.toInt()}",
                                color = if (isSelected) BgPrimary else TextPrimary,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }

            // Spin Button
            GoldButton(
                text = if (isSpinning) "SPINNING..." else "SPIN (₹${betAmount.toInt()})",
                isLoading = isSpinning,
                onClick = { executeSpin() }
            )
        }
    }
}

