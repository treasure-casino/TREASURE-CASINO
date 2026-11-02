package com.treasure.casino.ui.screens.wallet

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
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
fun WithdrawScreen(
    viewModel: WalletViewModel,
    onBack: () -> Unit
) {
    var amount by remember { mutableStateOf("1000") }
    var holder by remember { mutableStateOf("Test User") }
    var account by remember { mutableStateOf("123456789012") }
    var ifsc by remember { mutableStateOf("HDFC0001234") }
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
                Text("WITHDRAW DEMO CHIPS", color = GoldLight, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            }

            Spacer(modifier = Modifier.height(20.dp))

            TreasureTextField(value = amount, onValueChange = { amount = it }, label = "Withdraw Amount (₹)")
            Spacer(modifier = Modifier.height(12.dp))
            TreasureTextField(value = holder, onValueChange = { holder = it }, label = "Account Holder Name")
            Spacer(modifier = Modifier.height(12.dp))
            TreasureTextField(value = account, onValueChange = { account = it }, label = "Bank Account Number")
            Spacer(modifier = Modifier.height(12.dp))
            TreasureTextField(value = ifsc, onValueChange = { ifsc = it }, label = "Bank IFSC Code")

            if (successMsg != null) {
                Spacer(modifier = Modifier.height(16.dp))
                Text(successMsg!!, color = AccentGreen, fontSize = 13.sp, fontWeight = FontWeight.Bold)
            }
        }

        GoldButton(
            text = "SUBMIT WITHDRAWAL",
            onClick = {
                val amt = amount.toDoubleOrNull() ?: 1000.0
                viewModel.withdraw(amt, holder, account, ifsc)
                successMsg = "Simulated demo withdrawal request placed!"
            }
        )
    }
}

