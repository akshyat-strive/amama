"use client"

import Link from "next/link"
import Image from "next/image"
import {
  AlertTriangleIcon,
  BadgeCheckIcon,
  ClockIcon,
  HeartIcon,
  MessageCircleIcon,
  SettingsIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { cropLabels } from "@/features/dashboard/demo-data"
import { cropImageUrl } from "@/features/onboarding/steps"
import { GradeBadge } from "@/features/marketplace/grade-badge"
import { toggleWishlist, useWishlist } from "@/features/marketplace/wishlist-store"
import type { Listing } from "@/features/marketplace/listing-store"

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * One catalog tile — shared between the seller's own catalog and the
 * buyer's marketplace, since the product itself doesn't change between
 * those two views. Bento-style: one padded outer card, the photo an inset
 * tile inside it rather than bleeding to the card's own edges.
 *
 * Two sizes in one component rather than a separate mobile variant: a
 * two-up grid of these at desktop-card proportions would eat the whole
 * screen on a phone, so everything below `sm` runs smaller and drops the
 * lines that aren't essential to deciding whether to tap in (description,
 * seller name) — the same trim an Amazon or Instamart grid tile makes.
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
  const cropLabel = cropLabels[listing.cropId] ?? listing.cropId
  const verified = listing.moderationStatus === "verified"
  const wishlist = useWishlist(personId ?? "")
  const wishlisted = !!personId && wishlist.includes(listing.id)

  return (
    <div className="group relative rounded-2xl border border-border bg-card p-2 transition-colors sm:rounded-[28px] sm:p-3">
      <Link href={href} className="contents">
        <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl sm:rounded-2xl">
          <Image
            src={cropImageUrl(listing.photo, 480)}
            alt={cropLabel}
            fill
            sizes="(min-width: 1280px) 380px, (min-width: 640px) 45vw, 45vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />

          {verified ? (
            <span
              title="Verified by amama"
              aria-label="Verified by amama"
              className="absolute top-1.5 left-1.5 grid size-6 -rotate-6 place-items-center rounded-full bg-white shadow-md ring-2 ring-amama-deep/70 sm:top-2.5 sm:left-2.5 sm:size-8"
            >
              <BadgeCheckIcon className="size-3.5 fill-amama-deep text-white sm:size-5" />
            </span>
          ) : null}
        </div>

        <div className="flex flex-col pt-2 sm:pt-3">
          <div className="flex items-start justify-between gap-1.5 sm:gap-2">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold text-foreground sm:text-[16px]">{cropLabel}</p>
              <p className="mt-0.5 hidden truncate text-[13px] text-muted-foreground sm:block">
                {listing.variety}
              </p>
            </div>
            <GradeBadge grade={listing.grade} className="shrink-0 pt-0.5" />
          </div>

          <div className="mt-1.5 flex items-center justify-between gap-1.5 sm:mt-2 sm:gap-2">
            <p className="text-[13px] font-extrabold tracking-tight text-foreground tabular-nums sm:text-[18px]">
              {formatUsd(listing.pricePerTonneUsd)}
              <span className="ms-1 hidden text-[12px] font-medium text-muted-foreground sm:inline">
                / tonne
              </span>
            </p>
            <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-foreground/70 sm:px-2.5 sm:py-1 sm:text-[11px]">
              {listing.quantityMt} MT
            </span>
          </div>

          {listing.description ? (
            <p className="mt-2 hidden line-clamp-2 text-[13px] leading-relaxed text-muted-foreground sm:block">
              {listing.description}
            </p>
          ) : null}

          <div className="mt-2 hidden items-center gap-1.5 sm:mt-3 sm:flex">
            <span
              aria-hidden
              className="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-bold text-foreground/70"
            >
              {listing.sellerName.charAt(0)}
            </span>
            <p className="truncate text-[12px] font-medium text-foreground/70">
              {listing.sellerName}
            </p>
          </div>

          {ownerView ? <ModerationNote listing={listing} /> : null}

          <div className="mt-2 flex items-center justify-center gap-1 rounded-full bg-amama-deep py-1.5 text-[11px] font-semibold text-white transition-colors group-hover:bg-amama-deep-hover sm:mt-3 sm:gap-1.5 sm:py-2 sm:text-[13px]">
            <MessageCircleIcon className={cn("size-3 sm:size-3.5", ownerView && "hidden")} />
            <SettingsIcon className={cn("size-3 sm:size-3.5", !ownerView && "hidden")} />
            <span className="sm:hidden">{ownerView ? "Manage" : "Contact"}</span>
            <span className="hidden sm:inline">{ownerView ? "Manage listing" : "View & contact"}</span>
          </div>
        </div>
      </Link>

      {personId ? (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault()
            toggleWishlist(personId, listing.id)
          }}
          aria-label={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
          aria-pressed={wishlisted}
          className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition-transform hover:scale-110 active:scale-95 sm:top-[22px] sm:right-[22px] sm:size-8"
        >
          <HeartIcon
            className={cn(
              "size-3.5 transition-colors sm:size-4",
              wishlisted ? "fill-rose-500 text-rose-500" : "text-foreground/60"
            )}
          />
        </button>
      ) : null}
    </div>
  )
}

/** Only ever rendered in `ownerView` — a buyer never sees "pending" or
 *  "flagged" language anywhere, per the platform's own rule that an
 *  unverified listing should look exactly like a normal one. A seller
 *  needs to see all three, especially the reason and the name behind a
 *  flag. */
function ModerationNote({ listing }: { listing: Listing }) {
  if (listing.moderationStatus === "flagged") {
    return (
      <div className="mt-2 flex flex-col gap-1 rounded-xl bg-destructive/10 px-2 py-1.5 text-[10px] text-destructive sm:mt-3 sm:px-3 sm:py-2.5 sm:text-[12px]">
        <p className="flex items-center gap-1.5 font-semibold">
          <AlertTriangleIcon className="size-3 shrink-0 sm:size-3.5" />
          <span className="truncate">Hidden from marketplace</span>
        </p>
        {listing.moderationNote ? (
          <p className="hidden leading-relaxed sm:block">{listing.moderationNote}</p>
        ) : null}
        {listing.moderatedBy ? (
          <p className="hidden text-destructive/70 sm:block">
            — {listing.moderatedBy}
            {listing.moderatedAt
              ? `, ${new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(listing.moderatedAt))}`
              : null}
          </p>
        ) : null}
      </div>
    )
  }

  if (listing.moderationStatus === "unverified") {
    return (
      <p className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground sm:mt-3 sm:text-[12px]">
        <ClockIcon className="size-3 shrink-0 sm:size-3.5" />
        <span className="truncate">Pending KAM review</span>
      </p>
    )
  }

  return (
    <p className="mt-2 flex items-center gap-1.5 text-[10px] text-amama-deep sm:mt-3 sm:text-[12px]">
      <BadgeCheckIcon className="size-3 shrink-0 sm:size-3.5" />
      <span className="truncate">Verified by {listing.moderatedBy ?? "your KAM"}</span>
    </p>
  )
}

export { ListingCard, formatUsd }
