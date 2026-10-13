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

  return (
    <div>
      <h1 className="text-[34px] font-semibold tracking-[-0.03em]">Support</h1>
      <p className="mt-1 text-[15px] text-muted-foreground">
        Questions you&apos;ve raised and products you&apos;ve asked us to add. Raise a new one from any page with the lifebuoy at the top.
      </p>
      <div className="mt-6">
        <TicketsList tickets={mine} me={{ kind: "user", id: session.accountId, name }} emptyText="Nothing raised yet." />
      </div>
    </div>
  )
}

export { MyTicketsView }
