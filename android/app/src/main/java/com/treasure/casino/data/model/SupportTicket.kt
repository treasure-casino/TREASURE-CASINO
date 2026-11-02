package com.treasure.casino.data.model

data class SupportTicket(
    val id: String,
    val subject: String,
    val category: String, // PAYMENT, ACCOUNT, GAME, GENERAL
    val status: String, // OPEN, IN_PROGRESS, RESOLVED, CLOSED
    val priority: String = "NORMAL",
    val messages: List<TicketMessage> = emptyList(),
    val createdAt: String,
    val updatedAt: String? = null
)

data class TicketMessage(
    val id: String,
    val sender: String, // USER, SUPPORT
    val content: String,
    val timestamp: String
)

data class CreateTicketRequest(
    val subject: String,
    val category: String,
    val message: String
)

data class ReplyTicketRequest(
    val message: String
)

