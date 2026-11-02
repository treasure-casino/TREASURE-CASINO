package com.treasure.casino.ui.screens.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.treasure.casino.ui.components.GoldButton
import com.treasure.casino.ui.components.TreasureTextField
import com.treasure.casino.ui.theme.*

@Composable
fun RegisterScreen(
    onRegisterSuccess: () -> Unit,
    onNavigateLogin: () -> Unit
) {
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var referralCode by remember { mutableStateOf("") }
    var termsAccepted by remember { mutableStateOf(true) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BgPrimary)
            .padding(24.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "CREATE ACCOUNT",
                fontSize = 24.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = 2.sp,
                color = GoldLight
            )
            Text(
                text = "Join TREASURE & Claim ₹10,000 Demo Chips",
                fontSize = 11.sp,
                fontWeight = FontWeight.Medium,
                color = TextMuted
            )

            Spacer(modifier = Modifier.height(28.dp))

            TreasureTextField(
                value = name,
                onValueChange = { name = it },
                label = "Full Name"
            )

            Spacer(modifier = Modifier.height(14.dp))

            TreasureTextField(
                value = email,
                onValueChange = { email = it },
                label = "Email Address"
            )

            Spacer(modifier = Modifier.height(14.dp))

            TreasureTextField(
                value = phone,
                onValueChange = { phone = it },
                label = "Mobile Number (Optional)"
            )

            Spacer(modifier = Modifier.height(14.dp))

            TreasureTextField(
                value = password,
                onValueChange = { password = it },
                label = "Password",
                visualTransformation = PasswordVisualTransformation()
            )

            Spacer(modifier = Modifier.height(14.dp))

            TreasureTextField(
                value = referralCode,
                onValueChange = { referralCode = it },
                label = "Referral Code (Optional)"
            )

            Spacer(modifier = Modifier.height(16.dp))

            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Checkbox(
                    checked = termsAccepted,
                    onCheckedChange = { termsAccepted = it },
                    colors = CheckboxDefaults.colors(checkedColor = GoldPrimary)
                )
                Text(
                    text = "I accept the Terms & Responsible Gaming Policy",
                    color = TextMuted,
                    fontSize = 12.sp
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            GoldButton(
                text = "CREATE ACCOUNT",
                enabled = termsAccepted && email.isNotBlank() && password.isNotBlank(),
                onClick = onRegisterSuccess
            )

            Spacer(modifier = Modifier.height(20.dp))

            Row(
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    text = "Already have an account?",
                    color = TextMuted,
                    fontSize = 13.sp
                )
                Text(
                    text = "Login",
                    color = GoldLight,
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                    modifier = Modifier.clickable { onNavigateLogin() }
                )
            }
        }
    }
}

