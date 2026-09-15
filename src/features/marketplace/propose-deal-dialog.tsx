"use client"

import * as React from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cropLabels } from "@/features/dashboard/demo-data"
import type { Conversation } from "@/features/marketplace/conversation-store"
import { proposeDeal } from "@/features/marketplace/deal-store"
import type { Listing } from "@/features/marketplace/listing-store"

/**
 * The terms default to the listing's own price/quantity, but stay editable
 * — a real negotiation almost always lands somewhere other than the
 * asking price, and this is the one moment that agreed number gets
 * written down anywhere. Submitting doesn't finalize anything by itself;
 * it only starts the propose/confirm handshake (see `deal-store.ts`).
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
  const [price, setPrice] = React.useState(() => String(listing.pricePerTonneUsd))
  const [quantity, setQuantity] = React.useState(() => String(listing.quantityMt))
  const [error, setError] = React.useState<string | null>(null)

  const submit = () => {
    const priceNum = Number(price)
    const quantityNum = Number(quantity)
    if (!(priceNum > 0) || !(quantityNum > 0)) {
      setError("Enter a price and quantity above zero.")
      return
    }
    const cropLabel = cropLabels[listing.cropId] ?? listing.cropId
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
      agreedPricePerTonneUsd: priceNum,
      agreedQuantityMt: quantityNum,
    })
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Propose a deal</DialogTitle>
          <DialogDescription>
            Confirm the terms you&apos;ve agreed on — the other side still has to accept before
            this locks in.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
            Price (USD / tonne)
            <Input
              type="number"
              min={1}
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
            Quantity (MT)
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </label>
          {error ? <p className="text-[13px] font-medium text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button onClick={submit}>Send proposal</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { ProposeDealDialog }
