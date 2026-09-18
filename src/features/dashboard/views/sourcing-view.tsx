"use client"

import * as React from "react"
import { HeartIcon, SearchIcon, StoreIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cropLabels } from "@/features/dashboard/demo-data"
import { ListingCard } from "@/features/marketplace/listing-card"
import { buyerIdentity } from "@/features/marketplace/identity"
import { useListings } from "@/features/marketplace/listing-store"
import { useWishlist } from "@/features/marketplace/wishlist-store"
import { useOnboarding } from "@/features/onboarding/onboarding-context"

/**
 * The marketplace itself — every seller's catalog, browsable the way an
 * OLX or Oyo listing grid is, not just the buyer's own shortlist. Route
 * and nav item are still "sourcing" (that's what a buyer is doing here),
 * the content underneath is the catalog. Each card links straight to the
 * product's own page — that's where the location, the full description,
 * and the conversation with its seller all live now.
 */
function SourcingView() {
  const { draft } = useOnboarding()
  const buyer = buyerIdentity(draft.buyer)

  const allListings = useListings()
  // A flagged listing is pulled from the marketplace entirely — the seller
  // still sees it (with the reason) on their own catalog page, but a buyer
  // never sees it exist at all, flagged or otherwise. A deleted one is
  // gone from both.
  const listings = React.useMemo(
    () => allListings.filter((listing) => listing.moderationStatus !== "flagged" && !listing.deletedAt),
    [allListings]
  )
  // `null` means "the buyer hasn't touched the dropdown yet" — the actual
  // selected value is derived below, so it can default to the buyer's own
  // sourcing picks the moment the onboarding draft (restored from
  // `sessionStorage` after mount) is actually available, rather than
  // freezing on "all" from whatever the very first render saw.
  const [cropFilter, setCropFilter] = React.useState<string | null>(null)
  const [wishlistOnly, setWishlistOnly] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const wishlist = useWishlist(buyer.id)
  const mySourcing = draft.buyer.sourcing

  const cropsInCatalog = React.useMemo(() => {
    const seen = new Set(listings.map((listing) => listing.cropId))
    return Array.from(seen).sort((a, b) =>
      (cropLabels[a] ?? a).localeCompare(cropLabels[b] ?? b)
    )
  }, [listings])

  const effectiveCropFilter = cropFilter ?? (mySourcing.length > 0 ? "mine" : "all")

  const visible = React.useMemo(() => {
    let result =
      effectiveCropFilter === "all"
        ? listings
        : effectiveCropFilter === "mine"
          ? listings.filter((listing) => mySourcing.includes(listing.cropId))
          : listings.filter((listing) => listing.cropId === effectiveCropFilter)
    if (wishlistOnly) result = result.filter((listing) => wishlist.includes(listing.id))
    // Product names only — the crop and the seller's own variety name for
    // it — plus who's selling it. A listing's description is deliberately
    // left out: it's prose, not something a buyer would type into search.
    const term = query.trim().toLowerCase()
    if (term) {
      result = result.filter((listing) => {
        const haystack = [cropLabels[listing.cropId] ?? listing.cropId, listing.variety, listing.sellerName]
          .join(" ")
          .toLowerCase()
        return haystack.includes(term)
      })
    }
    return result
  }, [listings, effectiveCropFilter, mySourcing, wishlistOnly, wishlist, query])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-bold tracking-tight">Marketplace</h1>

        <div className="flex items-center gap-2">
          <InputGroup className="h-9 w-44 sm:w-56">
            <InputGroupAddon>
              <SearchIcon className="size-3.5" />
            </InputGroupAddon>
            <InputGroupInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search sellers, crops…"
              className="text-[13px]"
            />
          </InputGroup>

          <button
            type="button"
            onClick={() => setWishlistOnly((value) => !value)}
            aria-pressed={wishlistOnly}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors",
              wishlistOnly
                ? "border-transparent bg-amama-deep text-white"
                : "border-border text-foreground hover:bg-muted"
            )}
          >
            <HeartIcon className={cn("size-3.5", wishlistOnly && "fill-white")} />
            Wishlist
          </button>

          {cropsInCatalog.length > 0 ? (
            <Select value={effectiveCropFilter} onValueChange={(value) => setCropFilter(value as string)}>
              <SelectTrigger className="w-44">
                <SelectValue>
                  {(value) =>
                    value === "all"
                      ? "All crops"
                      : value === "mine"
                        ? "My products"
                        : cropLabels[value as string] ?? (value as string)
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {mySourcing.length > 0 ? <SelectItem value="mine">My products</SelectItem> : null}
                <SelectItem value="all">All crops</SelectItem>
                {cropsInCatalog.map((cropId) => (
                  <SelectItem key={cropId} value={cropId}>
                    {cropLabels[cropId] ?? cropId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border py-16 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-amama-subtle text-amama-deep">
            <StoreIcon className="size-5" strokeWidth={2.25} />
          </span>
          <h2 className="text-[17px] font-bold">Nothing here yet</h2>
          <p className="max-w-xs text-[14px] leading-relaxed text-muted-foreground">
            {query.trim()
              ? `No sellers match "${query.trim()}".`
              : wishlistOnly
                ? "Nothing saved to your wishlist yet."
                : effectiveCropFilter === "mine"
                  ? "No sellers list your selected products yet — try All crops."
                  : "No sellers have listed this crop yet — try another one."}
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {visible.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              href={`/buyer/dashboard/sourcing/${listing.id}`}
              personId={buyer.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export { SourcingView }
