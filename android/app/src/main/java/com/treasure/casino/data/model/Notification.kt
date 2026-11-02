package com.treasure.casino.data.model

data class Notification(
    val id: String,
    val title: String,
    val message: String,
    val type: String = "INFO", // PROMOTION, TRANSACTION, SYSTEM, VIP
    val isRead: Boolean = false,
    val createdAt: String
)

