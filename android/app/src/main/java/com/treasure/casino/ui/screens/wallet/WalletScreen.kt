package com.treasure.casino.ui.screens.wallet

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import com.treasure.casino.ui.components.GoldOutlinedButton
import com.treasure.casino.ui.components.StatusBadge
import com.treasure.casino.ui.components.TreasureCard
import com.treasure.casino.ui.theme.*
import com.treasure.casino.ui.viewmodel.WalletViewModel

@Composable
fun WalletScreen(
    viewModel: WalletViewModel,
    onNavigateDeposit: () -> Unit,
    onNavigateWithdraw: () -> Unit,
    onNavigateHistory: () -> Unit
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
            text = "DEMO WALLET",
            color = GoldLight,
            fontSize = 20.sp,
            fontWeight = FontWeight.Black,
            letterSpacing = 2.sp
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Balance Card
        TreasureCard(
            borderColor = GoldPrimary,
            borderWidth = 1.5.dp
        ) {
            Text("TOTAL SIMULATED BALANCE", color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(4.dp))
            Row(verticalAlignment = Alignment.Bottom) {
                Text("₹", color = GoldLight, fontSize = 28.sp, fontWeight = FontWeight.Black)
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = String.format("%,.2f", state.wallet?.balance ?: 10000.0),
                    color = TextPrimary,
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Black
                )
            }
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = "Simulated Demo Chips (Non-Monetary)",
                color = AccentGreen,
                fontSize = 11.sp,
                fontWeight = FontWeight.Medium
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            GoldButton(
                text = "ADD DEMO CHIPS",
                onClick = onNavigateDeposit,
                modifier = Modifier.weight(1f)
            )
            GoldOutlinedButton(
                text = "WITHDRAW DEMO",
                onClick = onNavigateWithdraw,
                modifier = Modifier.weight(1f)
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("RECENT TRANSACTIONS", color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.Bold)
            Text(
                text = "View All",
                color = GoldPrimary,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(4.dp)
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(bottom = 80.dp)
        ) {
            if (state.transactions.isEmpty()) {
                item {
                    Text(
                        text = "No recent transactions found.",
                        color = TextMuted,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(vertical = 16.dp)
                    )
                }
            } else {
                items(state.transactions) { tx ->
                    TreasureCard {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(tx.type, color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                Text(tx.createdAt, color = TextMuted, fontSize = 11.sp)
                            }
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text(
                                    text = "${if (tx.type == "DEPOSIT" || tx.type == "WIN") "+" else "-"}₹${tx.amount.toInt()}",
                                    color = if (tx.type == "DEPOSIT" || tx.type == "WIN") AccentGreen else AccentRed,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp
                                )
                                StatusBadge(status = tx.status)
                            }
                        }
                    }
                }
            }
        }
    }
}

