"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon, PackageSearchIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { cropLabels } from "@/features/dashboard/demo-data"
import { buyerIdentity } from "@/features/marketplace/identity"
import { ConversationThread } from "@/features/marketplace/conversation-thread"
import {
  conversationId,
  sendMessage,
  startConversation,
  toThreadMessages,
  useConversations,
} from "@/features/marketplace/conversation-store"
import { useListings } from "@/features/marketplace/listing-store"
import { ProductInfoPanel } from "@/features/marketplace/product-info-panel"
import { useOnboarding } from "@/features/onboarding/onboarding-context"

/** Same viewport-relative height on every full-height chat surface in the
 *  dashboard — the topbar offset (80px) plus the content wrapper's own
 *  top/bottom padding. Only applied from `lg` up: below that the two
 *  panels stack and the page is allowed to scroll normally. */
const FULL_HEIGHT = "lg:h-[calc(100dvh-104px)] sm:lg:h-[calc(100dvh-112px)]"

/**
 * A single product's own page — left is everything about it, right is the
 * one conversation this buyer has with that seller about exactly this
 * item. Contacting a seller now lands here rather than starting a
 * conversation straight from the card, so the product stays the anchor
 * for the whole exchange instead of getting lost in a generic inbox.
 *
 * Both panels sit inside one fixed-height row, each scrolling on its own —
 * the page itself never does. That's also why the "back" link lives inside
 * the info panel's own header rather than above the row: anything above
 * the row would eat into the height budget the row is sized against.
 */
function BuyerProductView({ listingId }: { listingId: string }) {
  const { draft } = useOnboarding()
  const buyer = buyerIdentity(draft.buyer)
  const listings = useListings()
  const listing = listings.find((entry) => entry.id === listingId && !entry.deletedAt)

  const conversations = useConversations()
  const id = listing ? conversationId(buyer.id, listing.sellerId, listing.id) : null
  const conversation = conversations.find((entry) => entry.id === id) ?? null

  if (!listing) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border py-16 text-center">
        <PackageSearchIcon className="size-6 text-muted-foreground" />
        <p className="text-[15px] font-semibold">This listing isn&apos;t available anymore</p>
        <Link href="/buyer/dashboard/sourcing" className="text-[13px] font-medium text-amama-deep underline">
          Back to the marketplace
        </Link>
      </div>
    )
  }

  const cropLabel = cropLabels[listing.cropId] ?? listing.cropId
  const messages = conversation ? toThreadMessages(conversation.messages, "buyer") : []

  const handleSend = (text: string) => {
    if (conversation) {
      sendMessage(conversation.id, "buyer", text)
      return
    }
    startConversation({
      buyerId: buyer.id,
      buyerName: buyer.name,
      sellerId: listing.sellerId,
      sellerName: listing.sellerName,
      listingId: listing.id,
      listingTitle: `${cropLabel} — ${listing.variety}`,
      openingMessage: text,
    })
  }

  return (
    <div className={cn("flex flex-col gap-4 lg:flex-row lg:overflow-hidden", FULL_HEIGHT)}>
      <div className="flex flex-col overflow-hidden rounded-3xl border border-border bg-card lg:w-[380px] lg:shrink-0">
        <div className="shrink-0 border-b border-border px-5 py-3.5">
          <Link
            href="/buyer/dashboard/sourcing"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-3.5" />
            Marketplace
          </Link>
        </div>
        <div className="lg:flex-1 lg:overflow-y-auto">
          <div className="p-4">
            <ProductInfoPanel listing={listing} />
          </div>
        </div>
      </div>

      <div className={cn("overflow-hidden rounded-3xl border border-border bg-card lg:flex-1", FULL_HEIGHT)}>
        <ConversationThread
          header={
            <div>
              <p className="text-[14px] font-semibold text-foreground">{listing.sellerName}</p>
              <p className="text-[12px] text-muted-foreground">
                {cropLabel} — {listing.variety}
              </p>
            </div>
          }
          messages={messages}
          onSend={handleSend}
          placeholder={`Message ${listing.sellerName}…`}
        />
      </div>
    </div>
  )
}

export { BuyerProductView }
