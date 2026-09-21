"use client"

import * as React from "react"
import { CheckIcon, ReceiptTextIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CardShell, Figure, type CardTone } from "@/features/marketplace/chat-card-shell"
import { formatInr } from "@/features/marketplace/currency"
import type { ChatParty } from "@/features/marketplace/conversation-store"
import { acceptQuote, findRfq, useRfqs, withdrawQuote } from "@/features/marketplace/rfq-store"

const statusCopy: Record<string, { label: string; tone: CardTone }> = {
  submitted: { label: "Awaiting a decision", tone: "warning" },
  accepted: { label: "Accepted", tone: "success" },
  "not-selected": { label: "Not selected", tone: "neutral" },
  withdrawn: { label: "Withdrawn", tone: "neutral" },
}

/** One seller's formal offer against an RFQ — lives only in that seller's
 *  own thread with the buyer, since it's not the other sellers' business
 *  what anyone else quoted. */
function RfqQuoteCard({
  rfqId,
  quoteId,
  viewer,
  viewerName,
}: {
  rfqId: string
  quoteId: string
  viewer: ChatParty
  viewerName: string
}) {
  useRfqs()
  const rfq = findRfq(rfqId)
  const quote = rfq?.quotes.find((entry) => entry.id === quoteId)
  if (!rfq || !quote) return null

  const copy = statusCopy[quote.status]
  const canAccept = viewer === "buyer" && quote.status === "submitted" && rfq.status === "open"
  const canWithdraw = viewer === "seller" && quote.status === "submitted" && rfq.status === "open"
  const total = quote.pricePerTonneUsd * quote.quantityMt

  return (
    <CardShell
      icon={ReceiptTextIcon}
      tone={copy.tone}
      title={`${quote.sellerName}'s quote`}
      subtitle={`Against "${rfq.title}" · ${copy.label}`}
      footer={
        canAccept || canWithdraw ? (
          <div className="flex gap-2">
            {canAccept ? (
              <Button size="sm" className="flex-1" onClick={() => acceptQuote(rfq.id, quote.id, viewerName)}>
                <CheckIcon className="size-4" />
                Accept this quote
              </Button>
            ) : null}
            {canWithdraw ? (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => withdrawQuote(rfq.id, quote.id, viewerName)}
              >
                Withdraw
              </Button>
            ) : null}
          </div>
        ) : undefined
      }
    >
      <div className="flex items-end justify-between gap-3">
        <Figure label="Total value" value={formatInr(total)} size="hero" />
      </div>
      <div className="mt-3.5 grid grid-cols-3 gap-3 border-t border-border pt-3.5">
        <Figure label="Price" value={`${formatInr(quote.pricePerTonneUsd)}/t`} />
        <Figure label="Quantity" value={`${quote.quantityMt} MT`} />
        <Figure label="Terms" value={quote.incoterm ?? "—"} hint={quote.deliveryWindow} />
      </div>
      {quote.paymentTerm || quote.validUntil ? (
        <p className="mt-2.5 text-[12px] text-muted-foreground">
          {quote.paymentTerm ? quote.paymentTerm : null}
          {quote.paymentTerm && quote.validUntil ? " · " : null}
          {quote.validUntil ? `Valid until ${new Date(quote.validUntil).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })}` : null}
        </p>
      ) : null}
      {quote.note ? (
        <p className="mt-2.5 rounded-2xl bg-muted px-3 py-2 text-[13px] leading-relaxed text-foreground">
          “{quote.note}”
        </p>
      ) : null}
    </CardShell>
  )
}

export { RfqQuoteCard }
