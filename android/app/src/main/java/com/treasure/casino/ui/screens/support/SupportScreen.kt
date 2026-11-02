package com.treasure.casino.ui.screens.support

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.treasure.casino.ui.components.GoldButton
import com.treasure.casino.ui.components.StatusBadge
import com.treasure.casino.ui.components.TreasureCard
import com.treasure.casino.ui.components.TreasureTextField
import com.treasure.casino.ui.theme.*
import com.treasure.casino.ui.viewmodel.SupportViewModel

@Composable
fun SupportScreen(
    viewModel: SupportViewModel
) {
    val state by viewModel.uiState.collectAsState()
    var showNewTicket by remember { mutableStateOf(false) }
    var subject by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BgPrimary)
            .statusBarsPadding()
            .padding(16.dp)
    ) {
        Text(
            text = "CUSTOMER SUPPORT",
            color = GoldLight,
            fontSize = 20.sp,
            fontWeight = FontWeight.Black,
            letterSpacing = 2.sp
        )

        Spacer(modifier = Modifier.height(16.dp))

        if (!showNewTicket) {
            GoldButton(
                text = "CREATE SUPPORT TICKET",
                onClick = { showNewTicket = true }
            )
        } else {
            TreasureCard {
                Text("NEW TICKET", color = GoldLight, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Spacer(modifier = Modifier.height(8.dp))
                TreasureTextField(value = subject, onValueChange = { subject = it }, label = "Subject")
                Spacer(modifier = Modifier.height(8.dp))
                TreasureTextField(value = message, onValueChange = { message = it }, label = "Detailed Message")
                Spacer(modifier = Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    GoldButton(
                        text = "SUBMIT",
                        onClick = {
                            if (subject.isNotBlank() && message.isNotBlank()) {
                                viewModel.createTicket(subject, "GENERAL", message)
                                showNewTicket = false
                                subject = ""
                                message = ""
                            }
                        },
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        Text("ACTIVE TICKETS", color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.Bold)

        Spacer(modifier = Modifier.height(10.dp))

        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(bottom = 80.dp)
        ) {
            items(state.tickets) { ticket ->
                TreasureCard {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(ticket.subject, color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            Text(ticket.createdAt, color = TextMuted, fontSize = 11.sp)
                        }
                        StatusBadge(status = ticket.status)
                    }
                }
            }
        }
    }
}

