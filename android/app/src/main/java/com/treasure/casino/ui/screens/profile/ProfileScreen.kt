package com.treasure.casino.ui.screens.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.treasure.casino.ui.components.TreasureCard
import com.treasure.casino.ui.theme.*
import com.treasure.casino.ui.viewmodel.ProfileViewModel

@Composable
fun ProfileScreen(
    viewModel: ProfileViewModel,
    onLogout: () -> Unit
) {
    val state by viewModel.uiState.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BgPrimary)
            .statusBarsPadding()
            .padding(16.dp)
            .verticalScroll(rememberScrollState())
            .padding(bottom = 80.dp)
    ) {
        Text(
            text = "MEMBER PROFILE",
            color = GoldLight,
            fontSize = 20.sp,
            fontWeight = FontWeight.Black,
            letterSpacing = 2.sp
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Profile Avatar Card
        TreasureCard(
            borderColor = GoldPrimary,
            borderWidth = 1.dp
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(60.dp)
                        .background(GoldPrimary.copy(alpha = 0.2f), RoundedCornerShape(30.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Text("👑", fontSize = 28.sp)
                }
                Column {
                    Text(state.user.displayName, color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Text(state.user.email, color = TextMuted, fontSize = 12.sp)
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("VIP LEVEL ${state.user.vipLevel} MEMBER", color = GoldLight, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        Text("ACCOUNT & SECURITY", color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)

        Spacer(modifier = Modifier.height(8.dp))

        ProfileMenuItem(title = "Account Details", icon = Icons.Default.Person, onClick = {})
        Spacer(modifier = Modifier.height(6.dp))
        ProfileMenuItem(title = "Security & Two-Factor", icon = Icons.Default.Shield, onClick = {})
        Spacer(modifier = Modifier.height(6.dp))
        ProfileMenuItem(title = "Responsible Gaming", icon = Icons.Default.Shield, onClick = {})

        Spacer(modifier = Modifier.height(24.dp))

        // Logout Button
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(AccentRed.copy(alpha = 0.15f), RoundedCornerShape(12.dp))
                .clickable { onLogout() }
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            Icon(Icons.Default.ExitToApp, contentDescription = "Logout", tint = AccentRed)
            Spacer(modifier = Modifier.width(8.dp))
            Text("LOGOUT", color = AccentRed, fontWeight = FontWeight.Bold, fontSize = 14.sp)
        }
    }
}

@Composable
fun ProfileMenuItem(
    title: String,
    icon: ImageVector,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(BgSurface, RoundedCornerShape(12.dp))
            .clickable { onClick() }
            .padding(16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(icon, contentDescription = null, tint = GoldPrimary, modifier = Modifier.size(20.dp))
            Text(title, color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Medium)
        }
        Icon(Icons.Default.ChevronRight, contentDescription = null, tint = TextMuted, modifier = Modifier.size(18.dp))
    }
}

