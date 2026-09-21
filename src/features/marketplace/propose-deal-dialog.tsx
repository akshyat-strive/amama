"use client"

import * as React from "react"

import { productLabel } from "@/features/marketplace/catalog"
import type { Conversation } from "@/features/marketplace/conversation-store"
import { DealTermsDialog } from "@/features/marketplace/deal-terms-dialog"
import { proposeDeal } from "@/features/marketplace/deal-store"
import type { Listing } from "@/features/marketplace/listing-store"

/**
 * The terms default to the listing's own price/quantity, but stay editable
 * — a real negotiation almost always lands somewhere other than the
 * asking price, and this is the one moment that agreed number gets
 * written down anywhere. Submitting doesn't finalize anything by itself;
 * it only opens the first round (see `deal-store.ts`).
 */
function ProposeDealDialog({
  open,
  onOpenChange,
  listing,
  conversation,
  role,
  myName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  listing: Listing
  conversation: Conversation
  role: "buyer" | "seller"
  myName: string
}) {
  const initial = React.useMemo(
    () => ({ pricePerTonneUsd: listing.pricePerTonneUsd, quantityMt: listing.quantityMt }),
    [listing.pricePerTonneUsd, listing.quantityMt]
  )

  return (
    <DealTermsDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Propose a deal"
      description="Put your terms on the table. The other side can accept, counter with different numbers, or decline."
      submitLabel="Send proposal"
      initial={initial}
      onSubmit={(terms) => {
        const cropLabel = productLabel(listing.cropId)
        proposeDeal({
          conversationId: conversation.id,
          listingId: listing.id,
          listingTitle: `${cropLabel} — ${listing.variety}`,
          buyerId: conversation.buyerId,
          buyerName: conversation.buyerName,
          sellerId: conversation.sellerId,
          sellerName: conversation.sellerName,
          proposedBy: role,
          proposerName: myName,
          agreedPricePerTonneUsd: terms.pricePerTonneUsd,
          agreedQuantityMt: terms.quantityMt,
          incoterm: terms.incoterm,
          deliveryWindow: terms.deliveryWindow,
          note: terms.note,
        })
      }}
    />
  )
}

export { ProposeDealDialog }
