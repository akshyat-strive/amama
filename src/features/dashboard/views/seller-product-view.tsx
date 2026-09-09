"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon, ChevronRightIcon, PackageSearchIcon, UsersIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { cropLabels } from "@/features/dashboard/demo-data"
import { sellerIdentity } from "@/features/marketplace/identity"
import { ConversationThread } from "@/features/marketplace/conversation-thread"
import {
  logSystemMessage,
  sendMessage,
  toThreadMessages,
  useConversations,
} from "@/features/marketplace/conversation-store"
import { softDeleteListing, useListings } from "@/features/marketplace/listing-store"
import { ProductInfoPanel } from "@/features/marketplace/product-info-panel"
import { useOnboarding } from "@/features/onboarding/onboarding-context"

/** Same viewport-relative height as every other full-height chat surface
 *  in the dashboard, only from `lg` up — below that the panels stack and
 *  the page scrolls normally. */
const FULL_HEIGHT = "lg:h-[calc(100dvh-104px)] sm:lg:h-[calc(100dvh-112px)]"

/**
 * The seller's side of a single product: who's asked about it, and the
 * conversation with whichever one is selected. There can be several
 * buyers for one listing (unlike the buyer's own product page, which only
 * ever has one seller to talk to) — so the right column is a small
 * master/detail of its own, sliding from the buyer list to a transcript
 * and back within the same panel rather than opening a new one.
 *
 * Both panels sit inside one fixed-height row, each scrolling on its own —
 * the page itself never does, and the "back" link lives inside the info
 * panel's own header for the same reason as the buyer's version.
 */
function SellerProductView({ listingId }: { listingId: string }) {
  const router = useRouter()
  const { draft } = useOnboarding()
  const seller = sellerIdentity(draft.seller)
  const listings = useListings()
  const listing = listings.find((entry) => entry.id === listingId)

  const conversations = useConversations()
  const productConversations = React.useMemo(
    () => conversations.filter((entry) => entry.listingId === listingId && entry.sellerId === seller.id),
    [conversations, listingId, seller.id]
  )

  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const selected = productConversations.find((entry) => entry.id === selectedId) ?? null

  if (!listing) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border py-16 text-center">
        <PackageSearchIcon className="size-6 text-muted-foreground" />
        <p className="text-[15px] font-semibold">This listing no longer exists</p>
        <Link href="/seller/dashboard/listings" className="text-[13px] font-medium text-amama-deep underline">
          Back to your catalog
        </Link>
      </div>
    )
  }

  const cropLabel = cropLabels[listing.cropId] ?? listing.cropId
  const messages = selected ? toThreadMessages(selected.messages, "seller") : null

  const handleRemove = () => {
    softDeleteListing(listing.id)
    if (productConversations.length > 0) {
      logSystemMessage(listing.id, `${seller.name} removed this listing`)
    }
    router.push("/seller/dashboard/listings")
  }

  return (
    <div className={cn("flex flex-col gap-4 lg:flex-row lg:overflow-hidden", FULL_HEIGHT)}>
      <div className="flex flex-col overflow-hidden rounded-3xl border border-border bg-card lg:w-[380px] lg:shrink-0">
        <div className="shrink-0 border-b border-border px-5 py-3.5">
          <Link
            href="/seller/dashboard/listings"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-3.5" />
            Your catalog
          </Link>
        </div>
        <div className="lg:flex-1 lg:overflow-y-auto">
          <div className="p-4">
            <ProductInfoPanel
              listing={listing}
              ownerView
              onEdit={() => router.push(`/seller/dashboard/listings/${listing.id}/edit`)}
              onRemove={handleRemove}
            />
          </div>
        </div>
      </div>

      <div className={cn("relative overflow-hidden rounded-3xl border border-border bg-card lg:flex-1", FULL_HEIGHT)}>
        {/* Two panels sitting side by side in a double-width track — sliding
            between them is one `translate-x`, not a route change, so it
            reads as one wrapper with two states rather than a navigation. */}
        <div
          className={cn(
            "flex h-full w-[200%] transition-transform duration-300 ease-out",
            selected ? "-translate-x-1/2" : "translate-x-0"
          )}
        >
          <div className="h-full w-1/2 shrink-0">
            <BuyerList
              cropLabel={cropLabel}
              conversations={productConversations}
              onSelect={setSelectedId}
            />
          </div>
          <div className="h-full w-1/2 shrink-0">
            <ConversationThread
              header={
                selected ? (
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedId(null)}
                      aria-label="Back to buyers"
                      className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <ArrowLeftIcon className="size-4" />
                    </button>
                    <p className="text-[14px] font-semibold text-foreground">{selected.buyerName}</p>
                  </div>
                ) : null
              }
              messages={messages}
              onSend={(text) => selected && sendMessage(selected.id, "seller", text)}
              placeholder={selected ? `Message ${selected.buyerName}…` : undefined}
              emptyState={<p className="text-[13px] text-muted-foreground">Pick a buyer to reply.</p>}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function BuyerList({
  cropLabel,
  conversations,
  onSelect,
}: {
  cropLabel: string
  conversations: ReturnType<typeof useConversations>
  onSelect: (id: string) => void
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-border px-5 py-3.5">
        <p className="text-[14px] font-semibold text-foreground">Buyers</p>
        <p className="text-[12px] text-muted-foreground">Everyone who&apos;s asked about {cropLabel}</p>
      </div>
      {conversations.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <UsersIcon className="size-5 text-muted-foreground" />
          <p className="text-[13px] text-muted-foreground">No one&apos;s reached out yet.</p>
        </div>
      ) : (
        <ul className="flex-1 divide-y divide-border overflow-y-auto">
          {conversations.map((conversation) => {
            const last = conversation.messages[conversation.messages.length - 1]
            return (
              <li key={conversation.id}>
                <button
                  type="button"
                  onClick={() => onSelect(conversation.id)}
                  className="flex w-full items-center gap-2.5 px-5 py-3.5 text-start transition-colors hover:bg-muted/50"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-[12px] font-bold text-foreground/70">
                    {conversation.buyerName.charAt(0)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-foreground">
                      {conversation.buyerName}
                    </span>
                    <span className="block truncate text-[12px] text-muted-foreground">
                      {last?.text}
                    </span>
                  </span>
                  <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground rtl:-scale-x-100" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export { SellerProductView }
