"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import type { Conversation } from "@/features/marketplace/conversation-store"
import { confirmDeal, declineDeal, DEAL_STAGE_LABELS, type Deal } from "@/features/marketplace/deal-store"
import { ProposeDealDialog } from "@/features/marketplace/propose-deal-dialog"
import type { Listing } from "@/features/marketplace/listing-store"

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * The one footer slot both product-view pages already reserve for their
 * own page-level actions (seller's Remove/Edit row is the other tenant of
 * this same spot). Reads as four fairly different things depending on
 * `deal`'s status, but it's one component because a conversation is only
 * ever in one of these states at a time — never two competing UIs fighting
 * for the same row.
 */
function DealStatusFooter({
  deal,
  conversation,
  listing,
  role,
  myName,
  counterpartName,
}: {
  deal: Deal | null
  conversation: Conversation | null
  listing: Listing
  role: "buyer" | "seller"
  myName: string
  counterpartName: string
}) {
  const [proposing, setProposing] = React.useState(false)

  // Nothing to propose against yet — the marketplace conversation itself
  // hasn't started, so there's no `Conversation.id` for a deal to log
  // into (see `logSystemMessageForConversation`).
  if (!conversation) return null

  if (!deal || deal.status === "declined") {
    return (
      <div className="flex shrink-0 items-center justify-between gap-3 pt-3">
        <p className="text-[12px] text-muted-foreground">
          {deal?.status === "declined" ? "That proposal was declined." : "Ready to close this one?"}
        </p>
        <Button size="sm" onClick={() => setProposing(true)}>
          Propose deal
        </Button>
        <ProposeDealDialog
          open={proposing}
          onOpenChange={setProposing}
          listing={listing}
          conversation={conversation}
          role={role}
          myName={myName}
        />
      </div>
    )
  }

  if (deal.status === "proposed") {
    const terms = `${formatUsd(deal.agreedPricePerTonneUsd)}/t × ${deal.agreedQuantityMt} MT`

    if (deal.proposedBy === role) {
      return (
        <div className="flex shrink-0 items-center gap-2.5 rounded-2xl bg-status-warning/10 px-4 py-3 pt-3">
          <p className="text-[13px] font-medium text-status-warning">
            Waiting for {counterpartName} to confirm — {terms}.
          </p>
        </div>
      )
    }

    return (
      <div className="flex shrink-0 flex-col gap-2 pt-3">
        <p className="text-[13px] font-medium text-foreground">
          {counterpartName} proposed a deal: {terms}.
        </p>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => confirmDeal(deal.id, role, myName)}>
            Confirm deal
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive"
            onClick={() => declineDeal(deal.id, role, myName)}
          >
            Decline
          </Button>
        </div>
      </div>
    )
  }

  // `active` — the pipeline itself is admin-only (KAM/Master Admin), this
  // is just a status line so both sides can see where things stand.
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 pt-3">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-foreground">Deal active</p>
        <p className="text-[12px] text-muted-foreground">
          {deal.stage ? DEAL_STAGE_LABELS[deal.stage] : "Pipeline starting"}
          {deal.assignedKamName ? ` · ${deal.assignedKamName}` : " · Awaiting KAM assignment"}
        </p>
      </div>
    </div>
  )
}

export { DealStatusFooter }
