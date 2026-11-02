package com.treasure.casino.ui.screens.rewards

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.treasure.casino.ui.components.GoldButton
import com.treasure.casino.ui.components.TreasureCard
import com.treasure.casino.ui.components.TreasureTextField
import com.treasure.casino.ui.theme.*
import com.treasure.casino.ui.viewmodel.RewardViewModel

@Composable
fun RewardsScreen(
    viewModel: RewardViewModel
) {
    val state by viewModel.uiState.collectAsState()
    var couponCode by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BgPrimary)
            .statusBarsPadding()
            .padding(16.dp)
    ) {
        Text(
            text = "REWARDS & BONUSES",
            color = GoldLight,
            fontSize = 20.sp,
            fontWeight = FontWeight.Black,
            letterSpacing = 2.sp
        )

        Spacer(modifier = Modifier.height(16.dp))

        // VIP Progress Bar
        TreasureCard {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("VIP LEVEL ${state.vipStatus.currentLevel}", color = GoldLight, fontWeight = FontWeight.Black, fontSize = 14.sp)
                Text(state.vipStatus.levelName, color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 13.sp)
            }
            Spacer(modifier = Modifier.height(8.dp))
            LinearProgressIndicator(
                progress = { state.vipStatus.points.toFloat() / state.vipStatus.pointsToNextLevel.toFloat() },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp),
                color = GoldPrimary,
                trackColor = BgPrimary
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = "${state.vipStatus.points} / ${state.vipStatus.pointsToNextLevel} VIP Points",
                color = TextMuted,
                fontSize = 11.sp
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Coupon Code Input
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            TreasureTextField(
                value = couponCode,
                onValueChange = { couponCode = it },
                label = "Enter Promo Coupon",
                modifier = Modifier.weight(1f)
            )
            Button(
                onClick = {
                    if (couponCode.isNotBlank()) {
                        viewModel.applyCoupon(couponCode)
                        couponCode = ""
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = GoldPrimary),
                modifier = Modifier.height(52.dp)
            ) {
                Text("APPLY", color = BgPrimary, fontWeight = FontWeight.Bold)
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        Text("AVAILABLE REWARDS", color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.Bold)

        Spacer(modifier = Modifier.height(10.dp))

        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(10.dp),
            contentPadding = PaddingValues(bottom = 80.dp)
        ) {
            items(state.rewards) { rew ->
                TreasureCard {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(rew.title, color = GoldLight, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text(rew.description, color = TextMuted, fontSize = 12.sp)
                        }
                        Button(
                            onClick = { viewModel.claimReward(rew.id) },
                            enabled = !rew.isClaimed,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (rew.isClaimed) BgSurfaceElevated else GoldPrimary
                            )
                        ) {
                            Text(
                                text = if (rew.isClaimed) "CLAIMED" else "CLAIM",
                                color = if (rew.isClaimed) TextMuted else BgPrimary,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    }
}

