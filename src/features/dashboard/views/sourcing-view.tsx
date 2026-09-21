"use client"

import * as React from "react"
import Link from "next/link"
import { HeartIcon, InfoIcon, LayoutGridIcon, SearchIcon, StoreIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CATALOG_CATEGORIES, productLabel, slugify } from "@/features/marketplace/catalog"
import { CategoryRail } from "@/features/marketplace/category-rail"
import { CatalogTile } from "@/features/marketplace/catalog-tile"
import { formatInr } from "@/features/marketplace/currency"
import { ListingCard } from "@/features/marketplace/listing-card"
import { buyerIdentity } from "@/features/marketplace/identity"
import { useListings } from "@/features/marketplace/listing-store"
import { useWishlist } from "@/features/marketplace/wishlist-store"
import { useOnboarding } from "@/features/onboarding/onboarding-context"

/**
 * The marketplace's top browse layer — categories, not sellers. A buyer
 * lands here, picks "Fruits", then "Apple", then "Kashmiri Apple", and only
 * *there* sees the sellers offering it — the drill-down the rest of this
 * file's sibling views (`category-products-view.tsx`,
 * `product-variants-view.tsx`, `variant-sellers-view.tsx`) carry on with.
 *
 * The category rail sits at the top of this same page rather than routing
 * away — picking "Fruits" just filters the product grid directly below it,
 * the same "category strip + grid" shape most marketplace homepages use.
 * "All Categories" is always the first, default-selected item.
 *
 * Search and Wishlist are the deliberate exceptions: both are "I already
 * know what I want" shortcuts, so either one switches this page over to a
 * flat `ListingCard` grid (the marketplace's old shape) instead of forcing
 * a buyer who typed "kashmiri" back through the category/product taps.
 */
const ALL_CATEGORIES_ID = "all"
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

  const [wishlistOnly, setWishlistOnly] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [showAllCategories, setShowAllCategories] = React.useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string>(ALL_CATEGORIES_ID)
  const wishlist = useWishlist(buyer.id)
  const mySourcing = draft.buyer.sourcing

  const flatMode = wishlistOnly || query.trim().length > 0

  const flatResults = React.useMemo(() => {
    if (!flatMode) return []
    let result = listings
    if (wishlistOnly) result = result.filter((listing) => wishlist.includes(listing.id))
    const term = query.trim().toLowerCase()
    if (term) {
      result = result.filter((listing) => {
        const haystack = [productLabel(listing.cropId), listing.variety, listing.sellerName].join(" ").toLowerCase()
        return haystack.includes(term)
      })
    }
    return result
  }, [flatMode, listings, wishlistOnly, wishlist, query])

  // One tile per non-empty category — a category nobody has listed anything
  // under yet doesn't get a tile that leads to an empty page.
  const categoryTiles = React.useMemo(() => {
    return CATALOG_CATEGORIES.map((category) => {
      const inCategory = listings.filter((listing) => listing.categoryId === category.id)
      if (inCategory.length === 0) return null
      const relevantToMe = inCategory.some((listing) => mySourcing.includes(listing.cropId))
      return { category, relevantToMe }
    }).filter((entry) => entry !== null)
  }, [listings, mySourcing])

  const visibleCategoryTiles =
    showAllCategories || mySourcing.length === 0
      ? categoryTiles
      : categoryTiles.filter((entry) => entry.relevantToMe).length > 0
        ? categoryTiles.filter((entry) => entry.relevantToMe)
        : categoryTiles

  // A category that dropped out of the rail (the buyer switched "Show all"
  // off after picking it) still shouldn't leave the grid stuck on a hidden
  // filter — fall back to "All Categories" rather than an empty page.
  const activeCategoryId =
    selectedCategoryId === ALL_CATEGORIES_ID ||
    visibleCategoryTiles.some((entry) => entry.category.id === selectedCategoryId)
      ? selectedCategoryId
      : ALL_CATEGORIES_ID

  // Level 2 of the drill-down, inlined onto this same page: every product
  // among whichever categories the rail is currently showing — one category
  // if selected, every visible one for "All Categories" — grouped by
  // `cropId` the same way `CategoryProductsView` groups a single category.
  const products = React.useMemo(() => {
    const visibleIds = new Set<string>(visibleCategoryTiles.map((entry) => entry.category.id))
    const scoped = listings.filter((listing) =>
      activeCategoryId === ALL_CATEGORIES_ID
        ? visibleIds.has(listing.categoryId)
        : listing.categoryId === activeCategoryId
    )
    const byProduct = new Map<string, typeof listings>()
    for (const listing of scoped) {
      const group = byProduct.get(listing.cropId)
      if (group) group.push(listing)
      else byProduct.set(listing.cropId, [listing])
    }
    return Array.from(byProduct.entries())
      .map(([cropId, group]) => ({
        cropId,
        categoryId: group[0].categoryId,
        label: productLabel(cropId),
        photo: group[0].photo,
        variantCount: new Set(group.map((listing) => slugify(listing.variety))).size,
        minPrice: Math.min(...group.map((listing) => listing.pricePerTonneUsd)),
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [listings, activeCategoryId, visibleCategoryTiles])

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
              placeholder="Search sellers, products…"
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

          {!flatMode ? (
            <div className="flex items-center gap-1.5">
              {mySourcing.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowAllCategories((value) => !value)}
                  aria-pressed={showAllCategories}
                  className={cn(
                    "flex h-9 items-center rounded-full border px-3.5 text-[13px] font-medium transition-colors",
                    showAllCategories
                      ? "border-transparent bg-amama-deep text-white"
                      : "border-border text-foreground hover:bg-muted"
                  )}
                >
                  Show all
                </button>
              ) : null}

              <Popover>
                <PopoverTrigger
                  openOnHover
                  aria-label='What does "Show all" mean?'
                  className="grid size-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:text-foreground"
                >
                  <InfoIcon className="size-4" />
                </PopoverTrigger>
                <PopoverContent side="bottom" align="end" className="w-64">
                  <p className="text-[13px] leading-relaxed text-foreground">
                    {mySourcing.length > 0
                      ? '"Show all" lists every category on amama — turn it off to see only the ones matching what you told us you\'re buying.'
                      : "Every category is shown by default. Tell us what you're buying and we'll bring those to the front."}
                  </p>
                  <Link
                    href="/buyer/onboarding/sourcing?from=marketplace"
                    className="mt-3 flex h-8 w-full items-center justify-center rounded-full bg-amama-deep text-[12px] font-semibold text-white transition-colors hover:bg-amama-deep-hover"
                  >
                    {mySourcing.length > 0 ? "Edit buying interests" : "Set your buying interests"}
                  </Link>
                </PopoverContent>
              </Popover>
            </div>
          ) : null}
        </div>
      </div>

      {flatMode ? (
        flatResults.length === 0 ? (
          <EmptyState
            message={
              query.trim() ? `No sellers match "${query.trim()}".` : "Nothing saved to your wishlist yet."
            }
          />
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {flatResults.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                href={`/buyer/dashboard/sourcing/listing/${listing.id}`}
                personId={buyer.id}
              />
            ))}
          </div>
        )
      ) : visibleCategoryTiles.length === 0 ? (
        <EmptyState message="No sellers have listed anything yet." />
      ) : (
        <div className="mt-6">
          <div className="mt-3">
            <CategoryRail
              items={[
                { id: ALL_CATEGORIES_ID, label: "All Categories", icon: LayoutGridIcon, photo: null },
                ...visibleCategoryTiles.map(({ category }) => ({
                  id: category.id,
                  label: category.label,
                  photo: category.photo,
                  icon: category.icon,
                })),
              ]}
              selectedId={activeCategoryId}
              onSelect={setSelectedCategoryId}
            />
          </div>

          {products.length === 0 ? (
            <EmptyState message="No sellers have listed anything in this category yet." />
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {products.map((product) => (
                <CatalogTile
                  key={`${product.categoryId}-${product.cropId}`}
                  href={`/buyer/dashboard/sourcing/${product.categoryId}/${product.cropId}`}
                  photo={product.photo}
                  title={product.label}
                  subtitle={`${product.variantCount} ${product.variantCount === 1 ? "variant" : "variants"}`}
                  meta={`from ${formatInr(product.minPrice)}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mt-8 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border py-16 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-amama-subtle text-amama-deep">
        <StoreIcon className="size-5" strokeWidth={2.25} />
      </span>
      <h2 className="text-[17px] font-bold">Nothing here yet</h2>
      <p className="max-w-xs text-[14px] leading-relaxed text-muted-foreground">{message}</p>
    </div>
  )
}

export { SourcingView }
