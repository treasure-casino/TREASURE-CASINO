package com.treasure.casino.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.treasure.casino.ui.theme.AccentRed
import com.treasure.casino.ui.theme.BgPrimary
import com.treasure.casino.ui.theme.TextMuted

@Composable
fun ErrorScreen(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(BgPrimary)
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "Something went wrong",
                color = AccentRed,
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp
            )
            Text(
                text = message,
                color = TextMuted,
                fontSize = 13.sp,
                textAlign = TextAlign.Center
            )
            GoldOutlinedButton(
                text = "Retry",
                onClick = onRetry,
                modifier = Modifier.width(160.dp)
            )
        }
    }
}

