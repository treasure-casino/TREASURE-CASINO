package com.treasure.casino.ui.theme

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

val BgPrimary = Color(0xFF0A0A0A)
val BgSecondary = Color(0xFF111111)
val BgSurface = Color(0xFF1A1A1A)
val BgSurfaceElevated = Color(0xFF242424)

val GoldPrimary = Color(0xFFD4AF37)
val GoldLight = Color(0xFFF5D060)
val GoldDark = Color(0xFFC9A227)
val GoldSubtle = Color(0x33D4AF37)

val TextPrimary = Color(0xFFFFFFFF)
val TextSecondary = Color(0xFFE0E0E0)
val TextMuted = Color(0xFF999999)

val AccentGreen = Color(0xFF10B981)
val AccentRed = Color(0xFFEF4444)
val AccentBlue = Color(0xFF3B82F6)
val AccentPurple = Color(0xFF8B5CF6)

val GoldGradient = Brush.horizontalGradient(
    colors = listOf(GoldLight, GoldPrimary, GoldDark)
)

val DarkSurfaceGradient = Brush.verticalGradient(
    colors = listOf(BgSurfaceElevated, BgSurface, BgPrimary)
)

