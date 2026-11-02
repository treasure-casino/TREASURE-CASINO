package com.treasure.casino.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.treasure.casino.ui.theme.AccentGreen
import com.treasure.casino.ui.theme.AccentRed
import com.treasure.casino.ui.theme.GoldPrimary

@Composable
fun StatusBadge(
    status: String,
    modifier: Modifier = Modifier
) {
    val (bgColor, textColor) = when (status.uppercase()) {
        "COMPLETED", "RESOLVED", "WON", "ACTIVE" -> Pair(AccentGreen.copy(alpha = 0.2f), AccentGreen)
        "PENDING", "IN_PROGRESS", "OPEN" -> Pair(GoldPrimary.copy(alpha = 0.2f), GoldPrimary)
        "FAILED", "LOST", "CANCELLED", "CLOSED" -> Pair(AccentRed.copy(alpha = 0.2f), AccentRed)
        else -> Pair(Color.Gray.copy(alpha = 0.2f), Color.White)
    }

    Text(
        text = status.uppercase(),
        color = textColor,
        fontSize = 11.sp,
        fontWeight = FontWeight.Bold,
        modifier = modifier
            .background(bgColor, RoundedCornerShape(6.dp))
            .padding(horizontal = 8.dp, vertical = 3.dp)
    )
}

