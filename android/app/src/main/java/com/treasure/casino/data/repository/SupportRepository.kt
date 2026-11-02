package com.treasure.casino.data.repository

import com.treasure.casino.data.model.CreateTicketRequest
import com.treasure.casino.data.model.ReplyTicketRequest
import com.treasure.casino.data.model.SupportTicket
import com.treasure.casino.data.model.TicketMessage
import com.treasure.casino.data.remote.ApiService
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SupportRepository @Inject constructor(
    private val apiService: ApiService
) {
    private val defaultTickets = mutableListOf(
        SupportTicket("t-101", "Simulated demo withdrawal question", "PAYMENT", "OPEN", "NORMAL", listOf(
            TicketMessage("m-1", "USER", "How do demo payouts work in simulated mode?", "2026-10-28 14:30"),
            TicketMessage("m-2", "SUPPORT", "All wallet demo chips are virtual balance for simulated testing.", "2026-10-28 14:35")
        ), "2026-10-28")
    )

    suspend fun getTickets(): Result<List<SupportTicket>> {
        return try {
            val res = apiService.getTickets()
            if (res.isSuccessful && !res.body()?.data.isNullOrEmpty()) {
                Result.success(res.body()!!.data!!)
            } else {
                Result.success(defaultTickets)
            }
        } catch (e: Exception) {
            Result.success(defaultTickets)
        }
    }

    suspend fun createTicket(subject: String, category: String, message: String): Result<SupportTicket> {
        val ticket = SupportTicket(
            id = "t-${System.currentTimeMillis()}",
            subject = subject,
            category = category,
            status = "OPEN",
            messages = listOf(TicketMessage("m-${System.currentTimeMillis()}", "USER", message, "Just now")),
            createdAt = "Just now"
        )
        defaultTickets.add(0, ticket)
        return Result.success(ticket)
    }

    suspend fun replyTicket(id: String, message: String): Result<SupportTicket> {
        val ticket = defaultTickets.find { it.id == id } ?: defaultTickets.first()
        val updated = ticket.copy(
            messages = ticket.messages + TicketMessage("m-${System.currentTimeMillis()}", "USER", message, "Just now")
        )
        val idx = defaultTickets.indexOfFirst { it.id == id }
        if (idx != -1) defaultTickets[idx] = updated
        return Result.success(updated)
    }
}

