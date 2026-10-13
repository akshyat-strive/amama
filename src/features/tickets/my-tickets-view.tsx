"use client"

import { findAccount, useSession } from "@/features/auth/local-auth"
import { useTickets } from "@/features/tickets/ticket-store"
import { TicketsList } from "@/features/tickets/tickets-list"
import type { OnboardingRole } from "@/features/onboarding/types"

/**
 * A buyer's or seller's own tickets — everything they've raised from any
 * page, and catalog requests from onboarding — each with its
 * conversation. Open before KYC approval, like Verification.
 */
function MyTicketsView({ role }: { role: OnboardingRole }) {
  const session = useSession()
  const tickets = useTickets()
  if (!session || session.kind !== role) return null
  const mine = tickets.filter((ticket) => ticket.raisedBy.id === session.accountId)
  const name = findAccount(session.accountId)?.name ?? session.accountId

  return <TicketsList title="Support" tickets={mine} me={{ kind: "user", id: session.accountId, name }} emptyText="Nothing raised yet — use the lifebuoy at the top of any page." />
}

export { MyTicketsView }
