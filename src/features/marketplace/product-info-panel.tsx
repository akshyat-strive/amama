"use client"

import { MapPinIcon, Trash2Icon } from "lucide-react"

import { productLabel } from "@/features/marketplace/catalog"
import { CropImage } from "@/features/marketplace/crop-image"
import { formatInr } from "@/features/marketplace/currency"
import { GradeInfoTrigger, gradeShortLabel } from "@/features/marketplace/grade-badge"
import { ProximityMap } from "@/features/marketplace/proximity-map"
import type { Listing } from "@/features/marketplace/listing-store"
import { countries } from "@/features/onboarding/countries"

/**
 * A listing's own page content, shared by the buyer's view and the
 * seller's. The photo leads, then what it is and what it costs, then the
 * three facts a trade is decided on as one strip, then the story and where
 * it grows. The seller line is only for someone who isn't the seller.
 */
function ProductInfoPanel({ listing, showSeller = true }: { listing: Listing; showSeller?: boolean }) {
  const cropLabel = productLabel(listing.cropId)
  const countryName = countries.find((entry) => entry.code === listing.country)?.name ?? listing.country
  const place = [listing.region, countryName].filter(Boolean).join(", ")

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[18px] bg-muted">
        <CropImage photo={listing.photo} width={760} alt={`${cropLabel} — ${listing.variety}`} sizes="(min-width: 1024px) 380px, 92vw" priority />
      </div>

      {listing.deletedAt ? (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2.5 text-[12.5px] font-medium text-destructive">
          <Trash2Icon aria-hidden className="size-4 shrink-0" />
          Removed — buyers can no longer find this listing.
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[20px] leading-tight font-bold tracking-tight text-foreground">{cropLabel}</h2>
          <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{listing.variety}</p>
        </div>
        <p className="shrink-0 text-end text-[20px] leading-tight font-bold tracking-tight text-foreground tabular-nums">
          {formatInr(listing.pricePerTonneUsd)}
          <span className="block text-[11.5px] font-medium tracking-normal text-muted-foreground">per tonne</span>
        </p>
      </div>

      <dl className="grid grid-cols-3 divide-x divide-border rounded-2xl border border-border">
        <div className="px-3 py-2.5">
          <dt className="text-[11px] text-muted-foreground">Available</dt>
          <dd className="text-[14px] font-semibold text-foreground tabular-nums">{listing.quantityMt} MT</dd>
        </div>
        <div className="px-3 py-2.5">
          <dt className="flex items-center gap-1 text-[11px] text-muted-foreground">
            Grade
            <GradeInfoTrigger grade={listing.grade} />
          </dt>
          <dd className="text-[14px] font-semibold text-foreground">{gradeShortLabel(listing.grade)}</dd>
        </div>
        <div className="min-w-0 px-3 py-2.5">
          <dt className="text-[11px] text-muted-foreground">Origin</dt>
          <dd className="truncate text-[14px] font-semibold text-foreground" title={place}>
            {listing.region.split(",")[0] || countryName}
          </dd>
        </div>
      </dl>

      {listing.description ? <p className="text-[13.5px] leading-relaxed text-foreground/80">{listing.description}</p> : null}

      <div>
        <ProximityMap country={listing.country} region={listing.region} pinX={listing.pinX} pinY={listing.pinY} showLabel={false} className="h-28 w-full rounded-2xl" />
        <p className="mt-1.5 flex items-center gap-1 text-[12px] text-muted-foreground">
          <MapPinIcon aria-hidden className="size-3.5 shrink-0" />
          <span className="truncate">{place}</span>
          <span className="ms-auto shrink-0">Approximate area</span>
        </p>
      </div>

      {showSeller ? (
        <div className="flex items-center gap-2.5 border-t border-border pt-3.5">
          <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-[12px] font-semibold text-foreground/70">
            {listing.sellerName.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground">Sold by</p>
            <p className="truncate text-[13.5px] font-semibold text-foreground">{listing.sellerName}</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export { ProductInfoPanel }
