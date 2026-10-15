"use client"

import * as React from "react"
import Link from "next/link"
import { MessageCircleQuestionMarkIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { CardShell, Figure } from "@/features/marketplace/chat-card-shell"
import { formatInr } from "@/features/marketplace/currency"
import type { ChatParty } from "@/features/marketplace/conversation-store"
import { findRfq, useRfqs } from "@/features/marketplace/rfq-store"

const decided = {
  accepted: { label: "Accepted", className: "bg-amama-subtle text-amama-deep" },
  "not-selected": { label: "Not selected", className: "bg-muted text-muted-foreground" },
} as const

/**
 * A buyer's question about one specific quote, posted into that seller's
 * thread. The quote is read live by id, so the numbers the seller is being
 * asked about are always the current ones — if they requote in answer, the
 * card shows the new price rather than the one the buyer saw.
 */
function QuoteQuestionCard({
  rfqId,
  quoteId,
  question,
  viewer,
}: {
  rfqId: string
  quoteId: string
  question: string
  viewer: ChatParty
}) {
  useRfqs()
  const rfq = findRfq(rfqId)
  const quote = rfq?.quotes.find((entry) => entry.id === quoteId)
  if (!rfq || !quote) return null

  const state = quote.status === "accepted" || quote.status === "not-selected" ? decided[quote.status] : null
  const total = quote.pricePerTonneUsd * quote.quantityMt
  const canRequote = viewer === "seller" && quote.status === "submitted" && rfq.status === "open"

  return (
    <CardShell
      icon={MessageCircleQuestionMarkIcon}
      title="Question about your quote"
      subtitle={`Against "${rfq.title}"`}
      footer={
        viewer === "seller" ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] font-medium text-muted-foreground">Reply in the chat below</p>
            {canRequote ? (
              <Link
                href={`/seller/dashboard/rfqs/${encodeURIComponent(rfq.id)}`}
                className="shrink-0 rounded-xl bg-muted px-3 py-1.5 text-[12px] font-semibold text-foreground transition-colors hover:bg-muted/70"
              >
                Update quote
              </Link>
            ) : null}
          </div>
        ) : undefined
      }
    >
      <div className="flex items-end justify-between gap-3">
        <Figure label="Total value" value={formatInr(total)} size="hero" />
        {state ? (
          <span className={cn("mb-1 shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold", state.className)}>{state.label}</span>
        ) : null}
      </div>
      <div className="mt-3.5 grid grid-cols-3 gap-3 border-t border-border pt-3.5">
        <Figure label="Price" value={`${formatInr(quote.pricePerTonneUsd)}/t`} />
        <Figure label="Quantity" value={`${quote.quantityMt} MT`} />
        <Figure label="Terms" value={quote.incoterm ?? "—"} hint={quote.validUntil ? `Valid until ${new Date(quote.validUntil).toLocaleDateString("en", { day: "numeric", month: "short" })}` : null} />
      </div>
      <p className="mt-3 rounded-2xl bg-muted px-3 py-2 text-[13px] leading-relaxed text-foreground">“{question}”</p>
    </CardShell>
  )
}

export { QuoteQuestionCard }
