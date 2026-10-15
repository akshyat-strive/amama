"use client"

import * as React from "react"
import { ClockIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ColumnCard } from "@/components/ui/column-card"
import { FilterSheet, ListHeading, SheetChoice, SheetToggle, StickyBar } from "@/components/ui/list-header"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AdminEmptyState } from "@/features/admin/admin-ui"
import { useCurrentAdmin } from "@/features/admin/current-admin"
import {
  ApproveButton,
  RequestAgainButton,
  RequestNote,
  RowNote,
  StatusPill,
  type Tone,
} from "@/features/admin/review-ui"
import { CategoryTabs } from "@/features/marketplace/marketplace-ui"
import { productLabel } from "@/features/marketplace/catalog"
import { CropImage } from "@/features/marketplace/crop-image"
import { formatInr } from "@/features/marketplace/currency"
import { gradeShortLabel } from "@/features/marketplace/grade-badge"
import { notifyFromKam } from "@/features/marketplace/kam-thread-store"
import { moderateListing, useListings, type Listing, type ModerationStatus } from "@/features/marketplace/listing-store"
import { countries, countryCodeToFlag } from "@/features/onboarding/countries"

const moderationStyles: Record<ModerationStatus, { label: string; tone: Tone }> = {
  unverified: { label: "Needs review", tone: "warning" },
  verified: { label: "Verified", tone: "success" },
  flagged: { label: "Requested again", tone: "danger" },
}

type Filter = ModerationStatus | "all"
type Sort = "newest" | "price" | "volume"

const FILTERS: { value: Filter; label: string }[] = [
  { value: "unverified", label: "Needs review" },
  { value: "flagged", label: "Requested again" },
  { value: "verified", label: "Verified" },
  { value: "all", label: "All" },
]

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(iso))
}

function ListingRow({ listing, reviewerName, canModerate }: { listing: Listing; reviewerName: string; canModerate: boolean }) {
  const [requesting, setRequesting] = React.useState(false)
  const status = moderationStyles[listing.moderationStatus]
  const country = countries.find((entry) => entry.code === listing.country)
  const crop = productLabel(listing.cropId)

  const requestAgain = (note: string) => {
    moderateListing(listing.id, "flagged", reviewerName, note || null)
    if (note) {
      notifyFromKam(
        listing.sellerId,
        "seller",
        `I've had to pull your ${crop} listing (${listing.variety}) from the marketplace: ${note}`
      )
    }
    setRequesting(false)
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 px-4 py-3">
        <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-muted">
          <CropImage photo={listing.photo} width={120} alt={`${crop} — ${listing.variety}`} sizes="48px" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-[14px] font-semibold text-foreground">
              {crop}
              <span className="font-normal text-muted-foreground"> · {listing.variety}</span>
            </p>
            {listing.deletedAt ? (
              <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-destructive">
                <Trash2Icon aria-hidden className="size-3" />
                Removed
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
            <span className="font-medium text-foreground/80">{listing.sellerName}</span>
            {" · "}
            {country ? `${countryCodeToFlag(country.code)} ${listing.region || country.name}` : listing.region}
          </p>
        </div>

        <dl className="hidden shrink-0 grid-cols-[2.5rem_4rem_6.5rem] gap-5 text-[12px] md:grid">
          <div>
            <dt className="text-[11px] text-muted-foreground">Grade</dt>
            <dd className="font-semibold text-foreground">{gradeShortLabel(listing.grade)}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground">Volume</dt>
            <dd className="font-semibold text-foreground tabular-nums">{listing.quantityMt} MT</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground">Price</dt>
            <dd className="font-semibold text-foreground tabular-nums">{formatInr(listing.pricePerTonneUsd)}/t</dd>
          </div>
        </dl>

        <div className="flex shrink-0 items-center justify-end gap-2 max-sm:w-full sm:w-[17rem]">
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
          {canModerate ? (
            <>
              <ApproveButton
                label="Mark verified"
                done={listing.moderationStatus === "verified"}
                onClick={() => moderateListing(listing.id, "verified", reviewerName)}
              />
              <RequestAgainButton active={requesting} onClick={() => setRequesting((value) => !value)} />
            </>
          ) : null}
        </div>
      </div>

      {requesting ? (
        <RequestNote
          id={`flag-${listing.id}`}
          prompt="What should the seller fix? (optional — sent to them as a message)"
          placeholder="Photos don't match the description — please resubmit."
          submitLabel="Pull & request again"
          required={false}
          onCancel={() => setRequesting(false)}
          onSubmit={requestAgain}
        />
      ) : listing.moderationStatus === "flagged" ? (
        <RowNote>
          {listing.moderationNote ?? "No reason recorded."}
          {listing.moderatedAt ? (
            <span className="text-destructive/70">
              {" "}
              — {listing.moderatedBy} · {formatDate(listing.moderatedAt)}
            </span>
          ) : null}
        </RowNote>
      ) : null}
    </div>
  )
}

function ListingsModerationView() {
  const listings = useListings()
  const admin = useCurrentAdmin()
  const reviewerName = admin?.user.name ?? "Admin"
  // Executives outside SaleOps see listings but don't moderate them.
  const canModerate = admin?.can("listings.moderate") ?? false
  const [filter, setFilter] = React.useState<Filter>("unverified")
  const [query, setQuery] = React.useState("")
  const [filtersOpen, setFiltersOpen] = React.useState(false)
  const [sort, setSort] = React.useState<Sort>("newest")
  const [country, setCountry] = React.useState("any")
  const [hideRemoved, setHideRemoved] = React.useState(false)

  const needle = query.trim().toLowerCase()
  const narrowed = React.useMemo(
    () =>
      listings
        .filter(
          (listing) =>
            (country === "any" || listing.country === country) &&
            (!hideRemoved || !listing.deletedAt) &&
            (!needle || [productLabel(listing.cropId), listing.variety, listing.sellerName, listing.region].join(" ").toLowerCase().includes(needle))
        )
        .sort((a, b) =>
          sort === "price" ? b.pricePerTonneUsd - a.pricePerTonneUsd : sort === "volume" ? b.quantityMt - a.quantityMt : b.createdAt.localeCompare(a.createdAt)
        ),
    [listings, country, hideRemoved, needle, sort]
  )
  const countFor = (value: Filter) =>
    value === "all" ? narrowed.length : narrowed.filter((listing) => listing.moderationStatus === value).length
  const visible = filter === "all" ? narrowed : narrowed.filter((listing) => listing.moderationStatus === filter)

  const listingCountries = [...new Set(listings.map((listing) => listing.country))]
    .map((code) => countries.find((entry) => entry.code === code))
    .filter((entry): entry is (typeof countries)[number] => !!entry)
  const filterCount = (sort !== "newest" ? 1 : 0) + (country !== "any" ? 1 : 0) + (hideRemoved ? 1 : 0)
  const clearFilters = () => {
    setSort("newest")
    setCountry("any")
    setHideRemoved(false)
  }

  return (
    <>
      <ColumnCard
        title="Listings"
        heading={
          <ListHeading
            title="Listings"
            query={query}
            onQueryChange={setQuery}
            placeholder="Product, variety or seller"
            filterCount={filterCount}
            onFilters={() => setFiltersOpen(true)}
          />
        }
      >
        <StickyBar>
          <CategoryTabs
            label="Listing review"
            items={FILTERS.map(({ value, label }) => ({ id: value, label, count: countFor(value) }))}
            selectedId={filter}
            onSelect={(next) => setFilter(next as Filter)}
          />
        </StickyBar>

        {visible.length === 0 ? (
          <AdminEmptyState
            icon={ClockIcon}
            title={needle || filterCount ? "No listings match" : filter === "unverified" ? "Nothing waiting on review" : "No listings here"}
            description={
              !needle && !filterCount && filter === "unverified" ? "New listings land here until someone verifies them or requests changes." : undefined
            }
          />
        ) : (
          <TooltipProvider delay={300}>
            <div className="divide-inset pt-1">
              {visible.map((listing) => (
                <ListingRow key={listing.id} listing={listing} reviewerName={reviewerName} canModerate={canModerate} />
              ))}
            </div>
          </TooltipProvider>
        )}
      </ColumnCard>

      <FilterSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        footer={
          <>
            {filterCount ? (
              <Button variant="outline" className="flex-1" onClick={clearFilters}>
                Clear
              </Button>
            ) : null}
            <Button className="flex-1" onClick={() => setFiltersOpen(false)}>
              Show {visible.length} listing{visible.length === 1 ? "" : "s"}
            </Button>
          </>
        }
      >
        <SheetChoice
          legend="Sort by"
          value={sort}
          onChange={setSort}
          options={[
            { value: "newest", label: "Newest" },
            { value: "price", label: "Price" },
            { value: "volume", label: "Volume" },
          ]}
        />
        {listingCountries.length > 1 ? (
          <SheetChoice
            legend="Origin"
            value={country}
            onChange={setCountry}
            options={[{ value: "any", label: "Anywhere" }, ...listingCountries.map((entry) => ({ value: entry.code, label: `${countryCodeToFlag(entry.code)} ${entry.name}` }))]}
          />
        ) : null}
        <SheetToggle label="Hide removed" hint="Listings the seller has taken down" checked={hideRemoved} onChange={setHideRemoved} />
      </FilterSheet>
    </>
  )
}

export { ListingsModerationView }
