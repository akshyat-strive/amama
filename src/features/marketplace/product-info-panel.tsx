"use client"

import Image from "next/image"
import { PenLineIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cropLabels } from "@/features/dashboard/demo-data"
import { cropImageUrl } from "@/features/onboarding/steps"
import { GradeBadge } from "@/features/marketplace/grade-badge"
import { ProximityMap } from "@/features/marketplace/proximity-map"
import type { Listing } from "@/features/marketplace/listing-store"

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * The product's own page content — everything that used to be crammed
 * onto the marketplace card (location, seller, full description) now
 * lives here instead, since the card's job is just to get someone to
 * this page. Shared between the buyer's read-only view and the seller's
 * own (which adds edit/remove).
 */
function ProductInfoPanel({
  listing,
  ownerView = false,
  onEdit,
  onRemove,
}: {
  listing: Listing
  ownerView?: boolean
  onEdit?: () => void
  onRemove?: () => void
}) {
  const cropLabel = cropLabels[listing.cropId] ?? listing.cropId

  return (
    <div className="flex flex-col gap-4">
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
        {formatUsd(listing.pricePerTonneUsd)}
        <span className="ms-1.5 text-[13px] font-medium text-muted-foreground">/ tonne</span>
      </p>

      {listing.description ? (
        <p className="text-[14px] leading-relaxed text-muted-foreground">{listing.description}</p>
      ) : null}

      <ProximityMap country={listing.country} region={listing.region} className="h-32 w-full rounded-2xl" />

      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-[12px] font-bold text-foreground/70">
          {listing.sellerName.charAt(0)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-foreground">{listing.sellerName}</p>
          <p className="text-[12px] text-muted-foreground">Seller</p>
        </div>
      </div>

      {ownerView && !listing.deletedAt ? (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
            <PenLineIcon />
            Edit listing
          </Button>
          <Button variant="outline" size="sm" className="flex-1 text-destructive" onClick={onRemove}>
            <Trash2Icon />
            Remove
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export { ProductInfoPanel, formatUsd }
