package com.treasure.casino.ui.screens.home.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.treasure.casino.ui.theme.*

@Composable
fun CategoryChip(
    title: String,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Text(
        text = title,
        color = if (isSelected) BgPrimary else TextPrimary,
        fontWeight = if (isSelected) FontWeight.Black else FontWeight.Medium,
        fontSize = 12.sp,
        modifier = modifier
            .clip(RoundedCornerShape(20.dp))
            .background(if (isSelected) GoldPrimary else BgSurface)
            .border(
                1.dp,
                if (isSelected) GoldLight else GoldSubtle,
                RoundedCornerShape(20.dp)
            )
            .clickable { onClick() }
            .padding(horizontal = 14.dp, vertical = 7.dp)
    )
}

