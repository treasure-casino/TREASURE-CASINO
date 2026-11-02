package com.treasure.casino.ui.screens.wallet

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.treasure.casino.ui.components.GoldButton
import com.treasure.casino.ui.components.TreasureTextField
import com.treasure.casino.ui.theme.*
import com.treasure.casino.ui.viewmodel.WalletViewModel

@Composable
fun DepositScreen(
    viewModel: WalletViewModel,
    onBack: () -> Unit
) {
    var amount by remember { mutableStateOf("500") }
    var successMsg by remember { mutableStateOf<String?>(null) }

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
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = GoldPrimary)
                }
                Text("ADD DEMO CHIPS", color = GoldLight, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            }

            Spacer(modifier = Modifier.height(24.dp))

            TreasureTextField(
                value = amount,
                onValueChange = { amount = it },
                label = "Demo Chips Amount (₹)"
            )

            Spacer(modifier = Modifier.height(16.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf("100", "500", "1000", "5000").forEach { preset ->
                    Button(
                        onClick = { amount = preset },
                        colors = ButtonDefaults.buttonColors(containerColor = BgSurfaceElevated),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("₹$preset", color = GoldLight, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            if (successMsg != null) {
                Spacer(modifier = Modifier.height(20.dp))
                Text(successMsg!!, color = AccentGreen, fontSize = 13.sp, fontWeight = FontWeight.Bold)
            }
        }

        GoldButton(
            text = "ADD DEMO CHIPS",
            onClick = {
                val amt = amount.toDoubleOrNull() ?: 500.0
                viewModel.deposit(amt)
                successMsg = "Added ₹${amt.toInt()} demo chips to wallet!"
            }
        )
    }
}

