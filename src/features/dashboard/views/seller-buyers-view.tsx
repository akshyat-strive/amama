"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { MessageCircleIcon, UsersIcon } from "lucide-react"

import { cropLabels } from "@/features/dashboard/demo-data"
import { countries, countryCodeToFlag } from "@/features/onboarding/countries"
import { cropImageUrl, crops } from "@/features/onboarding/steps"
import { BUYER_LEADS } from "@/features/marketplace/buyer-leads"
import { useBuyerProfiles } from "@/features/marketplace/buyer-directory"
import { useConversations } from "@/features/marketplace/conversation-store"
import { sellerIdentity } from "@/features/marketplace/identity"
import { useListings } from "@/features/marketplace/listing-store"
import { useOnboarding } from "@/features/onboarding/onboarding-context"

/** A cold lead — from the fixed roster (`buyer-leads.ts`) or a real
 *  buyer's own published profile (`buyer-directory.ts`), the two are
 *  interchangeable here — or a real buyer who has already messaged this
 *  seller about one of their own listings. All read as the same kind of
 *  card; only where "View & contact" lands differs — a lead opens a fresh
 *  thread, a real buyer with history opens the actual one, in Messages. */
type Match =
  | { kind: "lead"; id: string; name: string; country: string | null; cropId: string; href: string }
  | { kind: "conversation"; id: string; name: string; country: null; cropId: string; href: string }

/**
 * The reverse of the buyer's marketplace, same catalogue-grid shape as
 * `SourcingView` — a card per buyer sourcing a crop this seller actually
 * has listed, whether that's a cold lead or someone already mid-thread.
 */
function SellerBuyersView() {
  const { draft } = useOnboarding()
  const seller = sellerIdentity(draft.seller)

  const allListings = useListings()
  const conversations = useConversations()
  const buyerProfiles = useBuyerProfiles()

  const myCropIds = React.useMemo(() => {
    const seen = new Set(
      allListings
        .filter((listing) => listing.sellerId === seller.id && !listing.deletedAt)
        .map((listing) => listing.cropId)
    )
    return Array.from(seen)
  }, [allListings, seller.id])

  const matches = React.useMemo(() => {
    const result: Match[] = []
    const seenBuyerIds = new Set<string>()

    // Real buyers first — anyone who has already reached out about a
    // listing that's actually theirs (a deleted listing's old thread
    // doesn't count, there's nothing left to sell them).
    for (const conversation of conversations) {
      if (conversation.sellerId !== seller.id) continue
      const listing = allListings.find(
        (entry) => entry.id === conversation.listingId && entry.sellerId === seller.id && !entry.deletedAt
      )
      if (!listing) continue
      seenBuyerIds.add(conversation.buyerId)
      result.push({
        kind: "conversation",
        id: conversation.buyerId,
        name: conversation.buyerName,
        country: null,
        cropId: listing.cropId,
        href: `/seller/dashboard/messages?conversation=${conversation.id}`,
      })
    }

    // Then every other real buyer's own published sourcing (see
    // `buyer-directory.ts`) plus the cold-outreach roster — skipping
    // anyone already covered above so the same buyer never shows up
    // twice. Both are the same `BuyerLead` shape, so they share one loop.
    for (const lead of [...buyerProfiles, ...BUYER_LEADS]) {
      if (seenBuyerIds.has(lead.id)) continue
      const cropId = lead.sourcing.find((crop) => myCropIds.includes(crop))
      if (!cropId) continue
      seenBuyerIds.add(lead.id)
      result.push({
        kind: "lead",
        id: lead.id,
        name: lead.name,
        country: lead.country,
        cropId,
        href: `/seller/dashboard/buyers/${lead.id}`,
      })
    }

    return result
  }, [conversations, allListings, seller.id, myCropIds, buyerProfiles])

  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">Buyers</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Buyers sourcing a crop you actually have listed — reach out first.
      </p>

      {matches.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border py-16 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-amama-subtle text-amama-deep">
            <UsersIcon className="size-5" strokeWidth={2.25} />
          </span>
          <h2 className="text-[17px] font-bold">No buyers yet</h2>
          <p className="max-w-xs text-[14px] leading-relaxed text-muted-foreground">
            Add a listing and buyers sourcing that crop will show up here.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {matches.map((match) => (
            <BuyerMatchCard key={`${match.kind}-${match.id}`} match={match} />
          ))}
        </div>
      )}
    </div>
  )
}

/** Same bento shape as `ListingCard` — photo, bold title, a line under it,
 *  a pill, a green footer action — so a buyer reads as the same kind of
 *  tile a listing does, just standing for a person instead of a product.
 *  The photo is the crop's own (the thing that connects the two of them),
 *  not a headshot no seed data actually has. */
function BuyerMatchCard({ match }: { match: Match }) {
  const cropLabel = cropLabels[match.cropId] ?? match.cropId
  const photo = crops.find((crop) => crop.id === match.cropId)?.photo ?? crops[0].photo
  const country = match.country ? countries.find((entry) => entry.code === match.country) : null

  return (
    <div className="group relative rounded-2xl border border-border bg-card p-2 transition-colors sm:rounded-[28px] sm:p-3">
      <Link href={match.href} className="contents">
        <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl sm:rounded-2xl">
          <Image
            src={cropImageUrl(photo, 480)}
            alt={cropLabel}
            fill
            sizes="(min-width: 1280px) 380px, (min-width: 640px) 45vw, 45vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>

        <div className="flex flex-col pt-2 sm:pt-3">
          <p className="truncate text-[13px] font-bold text-foreground sm:text-[16px]">{match.name}</p>
          <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
            {country
              ? `${countryCodeToFlag(country.code)} ${country.name}`
              : match.kind === "conversation"
                ? "Already messaging you"
                : match.country}
          </p>

          <span className="mt-1.5 inline-flex w-fit rounded-full bg-amama-subtle px-2.5 py-1 text-[11px] font-semibold text-amama-deep sm:mt-2">
            Sourcing {cropLabel}
          </span>

          <div className="mt-2 flex items-center justify-center gap-1 rounded-full bg-amama-deep py-1.5 text-[11px] font-semibold text-white transition-colors group-hover:bg-amama-deep-hover sm:mt-3 sm:gap-1.5 sm:py-2 sm:text-[13px]">
            <MessageCircleIcon className="size-3 sm:size-3.5" />
            View & contact
          </div>
        </div>
      </Link>
    </div>
  )
}

export { SellerBuyersView }
