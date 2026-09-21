"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon, UserRoundSearchIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { productLabel } from "@/features/marketplace/catalog"
import { countries, countryCodeToFlag } from "@/features/onboarding/countries"
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
const FULL_HEIGHT = "lg:h-[calc(100dvh-92px)]"

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
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border py-16 text-center">
        <UserRoundSearchIcon className="size-6 text-muted-foreground" />
        <p className="text-[15px] font-semibold">This buyer isn&apos;t sourcing anything you sell anymore</p>
        <Link href="/seller/dashboard/buyers" className="text-[13px] font-medium text-amama-deep underline">
          Back to buyers
        </Link>
      </div>
    )
  }

  const cropLabel = productLabel(listing.cropId)
  const country = countries.find((entry) => entry.code === lead.country)

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
    <div className={cn("flex flex-col gap-4 pb-4 lg:flex-row lg:overflow-hidden lg:pb-0", FULL_HEIGHT)}>
      <div className="flex flex-col rounded-3xl bg-muted lg:w-[380px] lg:shrink-0 lg:overflow-hidden">
        <div className="flex shrink-0 items-center gap-2 p-3">
          <Link
            href="/seller/dashboard/buyers"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-3.5" />
            Buyers
          </Link>
        </div>

        <div className="rounded-[18px] bg-card shadow-sm [scrollbar-width:none] [-ms-overflow-style:none] lg:flex-1 lg:overflow-y-auto [&::-webkit-scrollbar]:hidden">
          <div className="p-4">
            <p className="text-[20px] font-bold tracking-tight text-foreground">{lead.name}</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {country ? `${countryCodeToFlag(country.code)} ${country.name}` : lead.country}
            </p>

            <p className="mt-4 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Sourcing
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {lead.sourcing.map((cropId) => (
                <span
                  key={cropId}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                    cropId === listing.cropId
                      ? "bg-amama-subtle text-amama-deep"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {productLabel(cropId)}
                </span>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-border p-3">
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                What you&apos;d be pitching
              </p>
              <p className="mt-1 text-[14px] font-bold text-foreground">
                {cropLabel} — {listing.variety}
              </p>
              <p className="text-[13px] text-muted-foreground">
                {formatInr(listing.pricePerTonneUsd)} / tonne · {listing.quantityMt} MT
              </p>
            </div>
          </div>
        </div>
      </div>

      <div
        className={cn("overflow-hidden rounded-3xl border border-border bg-card lg:flex-1", FULL_HEIGHT)}
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
