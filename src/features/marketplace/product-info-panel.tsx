"use client"

import Image from "next/image"
import { Trash2Icon } from "lucide-react"

import { productLabel } from "@/features/marketplace/catalog"
import { cropImageUrl } from "@/features/onboarding/steps"
import { formatInr } from "@/features/marketplace/currency"
import { GradeBadge } from "@/features/marketplace/grade-badge"
import { ProximityMap } from "@/features/marketplace/proximity-map"
import type { Listing } from "@/features/marketplace/listing-store"

/**
 * The product's own page content — everything that used to be crammed
 * onto the marketplace card (location, seller, full description) now
 * lives here instead, since the card's job is just to get someone to
 * this page. Shared between the buyer's read-only view and the seller's
 * own (which adds edit/remove).
 *
 * Ordered by what a buyer actually needs to decide, not by what's easiest
 * to shoot a photo of: what it is, how much, and for how much comes first;
 * the photo is confirmation, not the pitch, so it comes after. Seller
 * identity is context, not a decision input — it's the last line, not a
 * card competing for attention with the product itself.
 *
 * Edit/remove used to live here as a button row, but a seller's own actions
 * on their listing aren't part of what the listing *is* — they're the
 * page's own footer now (see `SellerProductView`), not this panel's.
 */
function ProductInfoPanel({ listing }: { listing: Listing }) {
  const cropLabel = productLabel(listing.cropId)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[22px] font-bold tracking-tight text-foreground">{cropLabel}</p>
          <p className="mt-0.5 text-[14px] text-muted-foreground">{listing.variety}</p>
          <p className="mt-1.5 text-[13px] font-semibold text-foreground">
            {listing.quantityMt} MT available
          </p>
        </div>
        <GradeBadge grade={listing.grade} className="shrink-0 pt-1 text-[20px]" />
      </div>

      {listing.deletedAt ? (
        <div className="flex items-center gap-2 rounded-2xl bg-destructive/10 px-4 py-3 text-[13px] font-medium text-destructive">
          <Trash2Icon className="size-4 shrink-0" />
          Removed from your catalog — buyers can no longer find this listing.
        </div>
      ) : null}

      <p className="text-[24px] font-extrabold tracking-tight text-foreground tabular-nums">
        {formatInr(listing.pricePerTonneUsd)}
        <span className="ms-1.5 text-[13px] font-medium text-muted-foreground">/ tonne</span>
      </p>

      {listing.description ? (
        <p className="text-[14px] leading-relaxed text-muted-foreground">{listing.description}</p>
      ) : null}

      {/* A single photo today, laid out the same way a multi-photo carousel
       *  would be (full-bleed, aspect-locked) so swapping in an actual
       *  carousel later — once a listing can carry more than one image —
       *  is a drop-in, not a redesign. */}
      <div className="relative aspect-4/3 w-full overflow-hidden rounded-3xl bg-muted">
        <Image
          src={cropImageUrl(listing.photo, 720)}
          alt={cropLabel}
          fill
          sizes="(min-width: 1024px) 480px, 90vw"
          className="object-cover"
          priority
        />
      </div>

      <ProximityMap country={listing.country} region={listing.region} className="h-32 w-full rounded-2xl" />

      <div>
        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Seller</p>
        <p className="mt-0.5 text-[14px] font-semibold text-foreground">{listing.sellerName}</p>
      </div>
    </div>
  )
}

export { ProductInfoPanel }
