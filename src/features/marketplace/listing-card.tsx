"use client"

import Link from "next/link"
import { ArrowUpRightIcon, ClockIcon, EyeOffIcon, MapPinIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { productLabel } from "@/features/marketplace/catalog"
import { CropImage } from "@/features/marketplace/crop-image"
import { formatInr } from "@/features/marketplace/currency"
import { gradeShortLabel } from "@/features/marketplace/grade-badge"
import { toggleWishlist, useWishlist } from "@/features/marketplace/wishlist-store"
import type { Listing } from "@/features/marketplace/listing-store"

/**
 * One listing, shared by the seller's catalog and the buyer's marketplace.
 * Only what decides a click: photo, product, grade, price, quantity and
 * where it grows. Everything else — the description, who moderated it, the
 * seller — lives on the listing's own page. The whole card is the link.
 */
function ListingCard({
  listing,
  href,
  ownerView = false,
  personId,
}: {
  listing: Listing
  href: string
  ownerView?: boolean
  personId?: string
}) {
  const cropLabel = productLabel(listing.cropId)
  const wishlist = useWishlist(personId ?? "")
  const wishlisted = !!personId && wishlist.includes(listing.id)
  const status = ownerView ? listing.moderationStatus : "verified"

  return (
    <div className="group relative rounded-[22px] border border-border bg-card p-1.5 transition-[box-shadow,border-color] duration-200 hover:border-foreground/15">
      <Link href={href} className="block outline-none focus-visible:ring-2 focus-visible:ring-amama-deep/40 rounded-[18px]">
        <div className="relative aspect-4/3 w-full overflow-hidden rounded-[16px] bg-muted">
          <CropImage
            photo={listing.photo}
            alt={`${cropLabel} — ${listing.variety}`}
            sizes="(min-width: 1280px) 360px, (min-width: 640px) 45vw, 50vw"
            className="transition-[opacity,transform] duration-500 group-hover:scale-[1.04]"
          />
          <span className="absolute top-2 left-2 rounded-full bg-card/90 px-2 py-0.5 text-[11px] font-bold text-foreground shadow-sm backdrop-blur">
            {gradeShortLabel(listing.grade)}
          </span>
          {status === "unverified" ? (
            <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-card/90 px-2 py-0.5 text-[11px] font-semibold text-status-warning shadow-sm backdrop-blur">
              <ClockIcon aria-hidden className="size-3" />
              In review
            </span>
          ) : status === "flagged" ? (
            <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-card/90 px-2 py-0.5 text-[11px] font-semibold text-destructive shadow-sm backdrop-blur">
              <EyeOffIcon aria-hidden className="size-3" />
              Hidden
            </span>
          ) : null}
        </div>

        <div className="px-1.5 pt-2.5 pb-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-foreground sm:text-[15px]">{cropLabel}</p>
              <p className="truncate text-[12px] text-muted-foreground">{listing.variety}</p>
            </div>
            <ArrowUpRightIcon
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
            />
          </div>

          <div className="mt-2 flex items-end justify-between gap-2">
            <p className="text-[15px] font-semibold tracking-tight text-foreground tabular-nums sm:text-[17px]">
              {formatInr(listing.pricePerTonneUsd)}
              <span className="ms-0.5 text-[11.5px] font-medium text-muted-foreground">/t</span>
            </p>
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground/75 tabular-nums">
              {listing.quantityMt} MT
            </span>
          </div>

          <p className="mt-1.5 flex items-center gap-1 truncate text-[11.5px] text-muted-foreground">
            <MapPinIcon aria-hidden className="size-3 shrink-0" />
            <span className="truncate">{[listing.region, listing.country].filter(Boolean).join(", ")}</span>
          </p>
        </div>
      </Link>

      {personId ? (
        <button
          type="button"
          onClick={() => toggleWishlist(personId, listing.id)}
          aria-label={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
          aria-pressed={wishlisted}
          className="absolute top-3.5 right-3.5 grid size-8 place-items-center rounded-full bg-card/90 shadow-sm backdrop-blur transition-transform hover:scale-110 active:scale-95"
        >
          <svg viewBox="0 0 24 24" aria-hidden className="size-4">
            <path
              d="M12 20.5s-7.5-4.6-9.2-9.3C1.6 7.8 3.9 4.5 7.3 4.5c2 0 3.5 1.1 4.7 2.8 1.2-1.7 2.7-2.8 4.7-2.8 3.4 0 5.7 3.3 4.5 6.7-1.7 4.7-9.2 9.3-9.2 9.3Z"
              strokeWidth={1.8}
              strokeLinejoin="round"
              className={cn(
                "transition-[fill,stroke] duration-200",
                wishlisted ? "fill-rose-500 stroke-rose-500" : "fill-transparent stroke-foreground/60"
              )}
            />
          </svg>
        </button>
      ) : null}
    </div>
  )
}

export { ListingCard }
