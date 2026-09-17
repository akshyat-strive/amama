"use client"

import * as React from "react"
import Image from "next/image"
import { ArrowRightIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { cropLabels } from "@/features/dashboard/demo-data"
import { cropImageUrl } from "@/features/onboarding/steps"
import { formatInr } from "@/features/marketplace/currency"
import { GradeBadge } from "@/features/marketplace/grade-badge"
import type { ListingDiff } from "@/features/marketplace/conversation-store"
import type { Listing } from "@/features/marketplace/listing-store"

/** Fields worth calling out in the comparison — everything a buyer would
 *  actually be negotiating against. */
function changedFields(before: Listing, after: Listing): (keyof Listing)[] {
  const watched: (keyof Listing)[] = [
    "variety",
    "grade",
    "quantityMt",
    "pricePerTonneUsd",
    "region",
    "description",
  ]
  return watched.filter((field) => before[field] !== after[field])
}

function SnapshotCard({
  label,
  listing,
  changed,
}: {
  label: string
  listing: Listing
  changed: (keyof Listing)[]
}) {
  const cropLabel = cropLabels[listing.cropId] ?? listing.cropId
  const isChanged = (field: keyof Listing) => changed.includes(field)

  return (
    <div className="w-full max-w-64 overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
      <p
        className={cn(
          "px-4 py-1.5 text-center text-[11px] font-bold tracking-wide uppercase",
          label === "Before" ? "bg-muted text-muted-foreground" : "bg-amama-deep text-white"
        )}
      >
        {label}
      </p>
      <div className="relative aspect-4/3 w-full overflow-hidden">
        <Image src={cropImageUrl(listing.photo, 320)} alt={cropLabel} fill className="object-cover" />
      </div>
      <div className="flex flex-col gap-1.5 p-4">
        <p className="text-[15px] font-bold text-foreground">{cropLabel}</p>
        <p className={cn("text-[13px] text-muted-foreground", isChanged("variety") && "font-bold text-status-warning")}>
          {listing.variety}
        </p>
        <div className={cn(isChanged("grade") && "rounded-lg ring-2 ring-status-warning")}>
          <GradeBadge grade={listing.grade} />
        </div>
        <p
          className={cn(
            "text-[16px] font-extrabold tabular-nums text-foreground",
            isChanged("pricePerTonneUsd") && "text-status-warning"
          )}
        >
          {formatInr(listing.pricePerTonneUsd)}
          <span className="ms-1 text-[11px] font-medium text-muted-foreground">/ tonne</span>
        </p>
        <p className={cn("text-[12px] text-muted-foreground", isChanged("quantityMt") && "font-bold text-status-warning")}>
          {listing.quantityMt} MT available
        </p>
      </div>
    </div>
  )
}

/**
 * The click-through behind a listing-change log line — two cards, no
 * enclosing chrome of its own, so the before and after read as the thing
 * being compared rather than content inside yet another panel.
 */
function ListingDiffDialog({
  open,
  onOpenChange,
  diff,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  diff: ListingDiff | null
}) {
  if (!diff) return null
  const changed = changedFields(diff.before, diff.after)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex max-w-[min(90vw,640px)] flex-col items-center gap-4 border-none bg-transparent p-0 shadow-none ring-0 sm:flex-row sm:justify-center"
      >
        <DialogTitle className="sr-only">What changed on this listing</DialogTitle>
        <SnapshotCard label="Before" listing={diff.before} changed={changed} />
        <ArrowRightIcon className="size-5 shrink-0 rotate-90 text-white drop-shadow sm:rotate-0" />
        <SnapshotCard label="After" listing={diff.after} changed={changed} />
      </DialogContent>
    </Dialog>
  )
}

export { ListingDiffDialog }
