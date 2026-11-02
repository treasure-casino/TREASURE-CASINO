package com.treasure.casino.ui.screens.referral

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.treasure.casino.ui.components.GoldButton
import com.treasure.casino.ui.components.StatusBadge
import com.treasure.casino.ui.components.TreasureCard
import com.treasure.casino.ui.theme.*
import com.treasure.casino.ui.viewmodel.ReferralViewModel

@Composable
fun ReferralScreen(
    viewModel: ReferralViewModel
) {
    val state by viewModel.uiState.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BgPrimary)
            .statusBarsPadding()
            .padding(16.dp)
    ) {
        Text(
            text = "INVITE & EARN",
            color = GoldLight,
            fontSize = 20.sp,
            fontWeight = FontWeight.Black,
            letterSpacing = 2.sp
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Referral Code Card
        TreasureCard(
            borderColor = GoldPrimary,
            borderWidth = 1.5.dp
        ) {
            Text("YOUR EXCLUSIVE REFERRAL CODE", color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(8.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(BgPrimary, RoundedCornerShape(12.dp))
                    .border(1.dp, GoldPrimary, RoundedCornerShape(12.dp))
                    .padding(vertical = 12.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = state.stats.referralCode,
                    color = GoldLight,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 3.sp
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text("Share with friends and earn 5% bonus demo chips on every round!", color = TextMuted, fontSize = 12.sp)
        }

        Spacer(modifier = Modifier.height(16.dp))

        GoldButton(
            text = "SHARE REFERRAL LINK",
            onClick = { /* Share intent */ }
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Referral Stats Grid
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            TreasureCard(modifier = Modifier.weight(1f)) {
                Text("Total Invited", color = TextMuted, fontSize = 11.sp)
                Text("${state.stats.totalInvited}", color = TextPrimary, fontWeight = FontWeight.Black, fontSize = 18.sp)
            }
            TreasureCard(modifier = Modifier.weight(1f)) {
                Text("Active Friends", color = TextMuted, fontSize = 11.sp)
                Text("${state.stats.successfulInvites}", color = AccentGreen, fontWeight = FontWeight.Black, fontSize = 18.sp)
            }
            TreasureCard(modifier = Modifier.weight(1f)) {
                Text("Bonus Earned", color = TextMuted, fontSize = 11.sp)
                Text("₹${state.stats.totalEarnings.toInt()}", color = GoldLight, fontWeight = FontWeight.Black, fontSize = 18.sp)
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        Text("INVITED FRIENDS", color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.Bold)

        Spacer(modifier = Modifier.height(10.dp))

        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(bottom = 80.dp)
        ) {
            items(state.history) { ref ->
                TreasureCard {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(ref.refereeName, color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            Text(ref.joinedAt, color = TextMuted, fontSize = 11.sp)
                        }
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("+₹${ref.earnedBonus.toInt()}", color = AccentGreen, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            StatusBadge(status = ref.status)
                        }
                    }
                }
            }
        }
    }
}

