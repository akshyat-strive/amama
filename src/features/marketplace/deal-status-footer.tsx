"use client"

import * as React from "react"
import { MessageSquareIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { Conversation } from "@/features/marketplace/conversation-store"
import { formatInr } from "@/features/marketplace/currency"
import {
  awaitingResponseFrom,
  DEAL_STAGE_LABELS,
  latestRound,
  type Deal,
} from "@/features/marketplace/deal-store"
import { ProposeDealDialog } from "@/features/marketplace/propose-deal-dialog"
import type { Listing } from "@/features/marketplace/listing-store"

/**
 * The one footer slot both product-view pages already reserve for their
 * own page-level actions (seller's Remove/Edit row is the other tenant of
 * this same spot).
 *
 * Deliberately *not* where a deal is accepted or declined any more: those
 * live on the proposal card in the thread, where the actual numbers are.
 * Two places to accept the same offer is two places to get it wrong, so
 * this row only ever starts the first offer or says where things stand and
 * points at the conversation.
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
          {deal?.status === "declined" ? "That deal fell through." : "Ready to close this one?"}
        </p>
        <Button size="sm" onClick={() => setProposing(true)}>
          {deal?.status === "declined" ? "Try again" : "Propose deal"}
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
    const round = latestRound(deal)
    const terms = `${formatInr(round.pricePerTonneUsd)}/t × ${round.quantityMt} MT`
    const yourMove = awaitingResponseFrom(deal) === role

    return (
      <div className="flex shrink-0 items-center gap-2.5 rounded-2xl bg-status-warning/10 px-4 py-3">
        <MessageSquareIcon className="size-4 shrink-0 text-status-warning" />
        <p className="text-[13px] font-medium text-status-warning">
          {yourMove
            ? `${round.byName} offered ${terms} — answer it in the conversation.`
            : `Waiting for ${counterpartName} to answer your ${terms} offer.`}
        </p>
      </div>
    )
  }

  // `active` — the pipeline itself is admin-only (KAM/Master Admin), this
  // is just a status line so both sides can see where things stand.
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-foreground">Deal agreed</p>
        <p className="text-[12px] text-muted-foreground">
          {deal.stage ? DEAL_STAGE_LABELS[deal.stage] : "Pipeline starting"}
          {deal.assignedKamName ? ` · ${deal.assignedKamName}` : " · Awaiting account manager"}
        </p>
      </div>
    </div>
  )
}

export { DealStatusFooter }
