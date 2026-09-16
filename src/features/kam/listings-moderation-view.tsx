"use client"

import * as React from "react"
import { AlertTriangleIcon, BadgeCheckIcon, ClockIcon, RotateCcw } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { AdminEmptyState } from "@/features/admin/admin-ui"
import { cropLabels } from "@/features/dashboard/demo-data"
import { countries, countryCodeToFlag } from "@/features/onboarding/countries"
import { notifyFromKam } from "@/features/marketplace/kam-thread-store"
import { useKamIdentity } from "@/features/admin/kam-identity"
import {
  moderateListing,
  useListings,
  type Listing,
  type ModerationStatus,
} from "@/features/marketplace/listing-store"

const moderationStyles: Record<ModerationStatus, { label: string; className: string }> = {
  unverified: { label: "Unverified", className: "bg-muted text-muted-foreground" },
  verified: { label: "Verified", className: "bg-amama-subtle text-amama-deep" },
  flagged: { label: "Flagged", className: "bg-destructive/10 text-destructive" },
}

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount)
}

function ListingModerationCard({ listing, kamName }: { listing: Listing; kamName: string }) {
  const [mode, setMode] = React.useState<"idle" | "flagging">("idle")
  const [note, setNote] = React.useState("")
  const status = moderationStyles[listing.moderationStatus]
  const country = countries.find((entry) => entry.code === listing.country)

  const flag = () => {
    const trimmed = note.trim()
    moderateListing(listing.id, "flagged", kamName, trimmed || null)
    if (trimmed) {
      notifyFromKam(
        listing.sellerId,
        "seller",
        `I've had to pull your ${cropLabels[listing.cropId] ?? listing.cropId} listing (${listing.variety}) from the marketplace: ${trimmed}`
      )
    }
    setMode("idle")
    setNote("")
  }

  return (
    <article className="overflow-hidden rounded-[20px] border border-border bg-muted">
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
        <div className="min-w-0">
          <h2 className="truncate text-[16px] font-bold tracking-tight">
            {cropLabels[listing.cropId] ?? listing.cropId} — {listing.variety}
          </h2>
          <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
            {listing.sellerName} · {listing.grade} · {listing.quantityMt} MT ·{" "}
            {formatUsd(listing.pricePerTonneUsd)}/t
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {country ? `${countryCodeToFlag(country.code)} ${country.name}` : listing.country}
            {listing.region ? ` · ${listing.region}` : ""}
          </p>
        </div>
        <Badge className={cn("shrink-0", status.className)}>{status.label}</Badge>
      </header>

      <div className="flex flex-col gap-3 border-t border-border bg-card p-5">
        {listing.moderationStatus === "flagged" ? (
          <div className="rounded-[14px] bg-destructive/10 px-3 py-2.5 text-[13px] text-destructive">
            {listing.moderationNote ? <p>{listing.moderationNote}</p> : <p>No reason recorded.</p>}
            {listing.moderatedAt ? (
              <p className="mt-1 text-destructive/70">
                by {listing.moderatedBy} ·{" "}
                {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
                  new Date(listing.moderatedAt)
                )}
              </p>
            ) : null}
          </div>
        ) : null}

        {mode === "flagging" ? (
          <div className="flex flex-col gap-2">
            <label htmlFor={`flag-${listing.id}`} className="text-[13px] font-medium">
              Reason (optional — also sent to the seller as a message)
            </label>
            <Textarea
              id={`flag-${listing.id}`}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Photos don't match the description — please resubmit."
              rows={3}
            />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={flag}>
                <AlertTriangleIcon />
                Flag listing
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setMode("idle")}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={listing.moderationStatus === "verified"}
              onClick={() => moderateListing(listing.id, "verified", kamName)}
            >
              <BadgeCheckIcon />
              Mark verified
            </Button>
            {listing.moderationStatus === "flagged" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => moderateListing(listing.id, "unverified", kamName)}
              >
                <RotateCcw />
                Clear flag
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setMode("flagging")}>
                <AlertTriangleIcon />
                Flag for review
              </Button>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

function ListingsModerationView() {
  const listings = useListings()
  const identity = useKamIdentity()
  const kamName = identity?.name ?? "KAM"

  return (
    <div>
      <h1 className="text-[19px] font-bold tracking-tight">Listings</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Every listing a seller publishes lands here, verified or not.
      </p>

      {listings.length === 0 ? (
        <AdminEmptyState icon={ClockIcon} title="No listings yet" />
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {listings.map((listing) => (
            <ListingModerationCard key={listing.id} listing={listing} kamName={kamName} />
          ))}
        </div>
      )}
    </div>
  )
}

export { ListingsModerationView }
