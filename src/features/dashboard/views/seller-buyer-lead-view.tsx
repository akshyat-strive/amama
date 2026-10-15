"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronLeftIcon, UserRoundSearchIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { ColumnCard, OnWhite, RecordCrumbs } from "@/components/ui/column-card"
import { productLabel } from "@/features/marketplace/catalog"
import { BUYER_LEADS } from "@/features/marketplace/buyer-leads"
import { useBuyerProfiles } from "@/features/marketplace/buyer-directory"
import { ConversationThread } from "@/features/marketplace/conversation-thread"
import {
  conversationId,
  sendMessage,
  startConversation,
  toThreadMessages,
  useConversations,
} from "@/features/marketplace/conversation-store"
import { formatInr } from "@/features/marketplace/currency"
import { sellerIdentity } from "@/features/marketplace/identity"
import { useListings } from "@/features/marketplace/listing-store"
import { useOnboarding } from "@/features/onboarding/onboarding-context"

/** Same viewport-relative height every other product/lead + chat row in
 *  the dashboard uses. */
const FULL_HEIGHT = "lg:h-[calc(100dvh-76px)]"

/**
 * One buyer lead's own page — mirrors `BuyerProductView`'s shape (a fixed
 * info panel, a conversation beside it) with the two sides swapped: the
 * left panel is who *they* are and what they're sourcing, not a listing,
 * and the seller is the one starting the thread.
 */
function SellerBuyerLeadView({ leadId }: { leadId: string }) {
  const { draft } = useOnboarding()
  const seller = sellerIdentity(draft.seller)
  const buyerProfiles = useBuyerProfiles()
  const lead =
    BUYER_LEADS.find((entry) => entry.id === leadId) ??
    buyerProfiles.find((entry) => entry.id === leadId)

  const allListings = useListings()
  const myListings = React.useMemo(
    () => allListings.filter((listing) => listing.sellerId === seller.id && !listing.deletedAt),
    [allListings, seller.id]
  )
  const listing = lead ? myListings.find((entry) => lead.sourcing.includes(entry.cropId)) : undefined

  const conversations = useConversations()
  const id = lead && listing ? conversationId(lead.id, seller.id, listing.id) : null
  const conversation = conversations.find((entry) => entry.id === id) ?? null
  const messages = lead && listing ? toThreadMessages(conversation?.messages ?? [], "seller") : null

  if (!lead || !listing) {
    return (
      <ColumnCard title="Buyers">
        <div className="flex flex-col items-center gap-3 rounded-[20px] bg-card py-16 text-center">
          <UserRoundSearchIcon className="size-6 text-muted-foreground" />
          <p className="text-[15px] font-semibold">This buyer isn&apos;t sourcing anything you sell anymore</p>
          <Link href="/seller/dashboard/buyers" className="text-[13px] font-medium text-amama-deep underline">
            Back to buyers
          </Link>
        </div>
      </ColumnCard>
    )
  }

  const cropLabel = productLabel(listing.cropId)

  const conversationHeader = (
    <div>
      <p className="text-[14px] font-semibold text-foreground">{lead.name}</p>
      <p className="text-[12px] text-muted-foreground">Sourcing {cropLabel}</p>
    </div>
  )

  const handleSend = (text: string) => {
    if (conversation) {
      sendMessage(conversation.id, "seller", text)
      return
    }
    startConversation({
      buyerId: lead.id,
      buyerName: lead.name,
      sellerId: seller.id,
      sellerName: seller.name,
      listingId: listing.id,
      listingTitle: `${cropLabel} — ${listing.variety}`,
      openingMessage: text,
      openingMessageFrom: "seller",
    })
  }

  return (
    <div className={cn("flex flex-col gap-3 pb-4 lg:flex-row lg:overflow-hidden lg:pb-0", FULL_HEIGHT)}>
      <OnWhite>
        <section aria-label={lead.name} className="flex flex-col rounded-[24px] bg-background p-2 lg:w-[380px] lg:shrink-0 lg:overflow-hidden">
          <header className="flex shrink-0 items-center gap-2.5 px-2 pt-1.5 pb-3">
            <Link
              href="/seller/dashboard/buyers"
              aria-label="Back to buyers"
              title="Buyers"
              className="grid size-9 shrink-0 place-items-center rounded-xl text-foreground/75 transition-colors hover:bg-muted"
            >
              <ChevronLeftIcon aria-hidden className="size-5 rtl:-scale-x-100" />
            </Link>
            <div className="min-w-0 flex-1">
              <RecordCrumbs crumbs={[{ label: "Buyers", href: "/seller/dashboard/buyers" }]} />
              <h1 className="mt-1 truncate text-[20px] leading-tight font-semibold tracking-[-0.02em]">{lead.name}</h1>
            </div>
          </header>
          <div aria-hidden className="mx-3 h-px shrink-0 bg-border" />

          <div className="flex flex-col gap-3 px-2 pt-3 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] lg:min-h-0 lg:flex-1 lg:overflow-y-auto [&::-webkit-scrollbar]:hidden">
            <section className="rounded-[20px] bg-card p-4">
              <h2 className="text-[13px] font-semibold text-foreground">Sourcing</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {lead.sourcing.map((cropId) => (
                  <span
                    key={cropId}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                      cropId === listing.cropId ? "bg-amama-subtle text-amama-deep" : "bg-background text-muted-foreground"
                    )}
                  >
                    {productLabel(cropId)}
                  </span>
                ))}
              </div>
            </section>

            <section className="rounded-[20px] bg-card p-4">
              <h2 className="text-[13px] font-semibold text-foreground">What you&apos;d be pitching</h2>
              <p className="mt-1.5 text-[14px] font-semibold text-foreground">
                {cropLabel} — {listing.variety}
              </p>
              <p className="text-[13px] text-muted-foreground">
                {formatInr(listing.pricePerTonneUsd)} / tonne · {listing.quantityMt} MT
              </p>
            </section>
          </div>
        </section>
      </OnWhite>

      <div
        className={cn("overflow-hidden rounded-[24px] bg-background lg:flex-1", FULL_HEIGHT)}
      >
        <ConversationThread
          header={conversationHeader}
          messages={messages}
          onSend={handleSend}
          viewer="seller"
          viewerName={seller.name}
          placeholder={`Message ${lead.name}…`}
          // Only once `conversation` is a real, already-started record —
          // a cold-outreach lead with nothing sent yet has no conversation
          // for a form-request card to attach to (see `handleSend`, which
          // is what actually creates one on the first plain message).
          conversationId={conversation?.id}
          composerParties={conversation ? [{ party: "buyer", name: lead.name }] : []}
          className="min-h-[420px]"
        />
      </div>
    </div>
  )
}

export { SellerBuyerLeadView }
