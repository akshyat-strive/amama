"use client"

import * as React from "react"
import Link from "next/link"
import { ClipboardListIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CardProgress, CardShell, Figure, type CardTone } from "@/features/marketplace/chat-card-shell"
import type { ChatParty } from "@/features/marketplace/conversation-store"
import {
  cancelRfq,
  confirmDemand,
  findRfq,
  quoteFromSeller,
  rfqProgress,
  useRfqs,
} from "@/features/marketplace/rfq-store"
import { RfqQuoteDialog } from "@/features/marketplace/rfq-quote-dialog"

/** Where each role reads the full RFQ — the buyer's own comparison page,
 *  or (for a seller/KAM, who have no comparison view of their own) back to
 *  the thread they're already in. */
function rfqHref(rfqId: string) {
  return `/buyer/dashboard/rfqs?rfq=${rfqId}`
}

/**
 * The RFQ as it shows up in one seller's thread — the spec the buyer
 * published, and whatever this seller can still do about it: quote, or
 * (once quoted) see that they have. The buyer sees the same card in every
 * one of the sellers' threads it went to, each one a live view of the same
 * underlying record.
 */
function RfqCard({
  rfqId,
  sellerId,
  viewer,
  viewerName,
}: {
  rfqId: string
  sellerId: string
  viewer: ChatParty
  viewerName: string
}) {
  useRfqs()
  const [quoting, setQuoting] = React.useState(false)
  const rfq = findRfq(rfqId)
  if (!rfq) return null

  const progress = rfqProgress(rfq)
  const myQuote = viewer === "seller" ? quoteFromSeller(rfq, sellerId) : null
  const cancelled = rfq.status === "cancelled"
  const closed = rfq.status === "closed"

  const tone: CardTone = cancelled ? "danger" : closed ? "success" : "brand"

  return (
    <>
      <CardShell
        icon={ClipboardListIcon}
        tone={tone}
        title={rfq.title}
        subtitle={`${rfq.buyerName} · ${progress.done} of ${progress.total} sellers quoted${
          rfq.demandConfirmed ? " · demand confirmed" : ""
        }`}
        cancelled={cancelled && rfq.cancelledAt && rfq.cancelledBy ? { at: rfq.cancelledAt, byName: rfq.cancelledBy } : null}
        footer={
          <div className="flex flex-col gap-2">
            {viewer === "buyer" ? (
              <>
                <Link
                  href={rfqHref(rfq.id)}
                  className="inline-flex h-9 items-center justify-center rounded-full bg-amama-deep px-4 text-center text-[13px] font-semibold text-white transition-colors hover:bg-amama-deep-hover"
                >
                  Compare quotes
                </Link>
                {!cancelled && !closed ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground"
                    onClick={() => cancelRfq(rfq.id, viewerName)}
                  >
                    Cancel RFQ
                  </Button>
                ) : null}
              </>
            ) : viewer === "seller" ? (
              !cancelled && !closed ? (
                <Button size="sm" onClick={() => setQuoting(true)} className="w-full">
                  {myQuote ? "Update your quote" : "Submit a quote"}
                </Button>
              ) : myQuote ? (
                <p className="text-[12px] font-medium text-muted-foreground">
                  {myQuote.status === "accepted" ? "Your quote was accepted." : "This RFQ has closed."}
                </p>
              ) : null
            ) : viewer === "kam" && !rfq.demandConfirmed && !cancelled ? (
              <Button size="sm" variant="outline" onClick={() => confirmDemand(rfq.id, viewerName)}>
                Confirm demand
              </Button>
            ) : null}
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Figure label="Quantity" value={rfq.spec.quantityMt ? `${rfq.spec.quantityMt} MT` : "—"} />
          <Figure label="Destination" value={rfq.spec.destinationPort ?? "—"} hint={rfq.spec.incoterm} />
        </div>
        <div className="mt-3.5 border-t border-border pt-3.5">
          <CardProgress done={progress.done} total={progress.total} label="quoted" tone="neutral" />
        </div>
      </CardShell>

      {viewer === "seller" ? (
        <RfqQuoteDialog open={quoting} onOpenChange={setQuoting} rfq={rfq} sellerId={sellerId} sellerName={viewerName} />
      ) : null}
    </>
  )
}

export { RfqCard, rfqHref }
