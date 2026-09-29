"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { StoreIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { InfoTip } from "@/features/dashboard/info-tip"
import { CATALOG_CATEGORIES, productLabel, slugify } from "@/features/marketplace/catalog"
import { CategoryChips, CategoryRail, type CategoryRailItem } from "@/features/marketplace/category-rail"
import { CatalogTile } from "@/features/marketplace/catalog-tile"
import { formatInr } from "@/features/marketplace/currency"
import { ListingCard } from "@/features/marketplace/listing-card"
import { buyerIdentity } from "@/features/marketplace/identity"
import { useListings, type Listing } from "@/features/marketplace/listing-store"
import { useWishlist } from "@/features/marketplace/wishlist-store"
import { WishlistSwitch } from "@/features/marketplace/wishlist-switch"
import { useOnboarding } from "@/features/onboarding/onboarding-context"

const ALL = "all"
const STICK_AT = 68

type Sort = "name" | "price"
const SORT_ITEMS: Record<Sort, string> = { name: "Name A–Z", price: "Lowest price" }

/** Up to three distinct listing photos — the "cards in hand" a category
 *  rail item fans out. */
function photosOf(listings: Listing[]): string[] {
  return [...new Set(listings.map((listing) => listing.photo).filter(Boolean))].slice(0, 3)
}

/**
 * The marketplace: categories as fanned photo cards up top, which collapse
 * into a slim chip slider pinned under the topbar once scrolled past, and
 * a product grid that animates as the filter changes. Search is the
 * topbar's — pressing Enter there on this page lands back here with `?q=`,
 * which switches the grid to matching listings.
 */
function SourcingWorkspace() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const query = searchParams.get("q")?.trim() ?? ""
  const { draft } = useOnboarding()
  const buyer = buyerIdentity(draft.buyer)
  const mySourcing = draft.buyer.sourcing

  const allListings = useListings()
  const listings = React.useMemo(
    () => allListings.filter((listing) => listing.moderationStatus !== "flagged" && !listing.deletedAt),
    [allListings]
  )

  const [wishlistOnly, setWishlistOnly] = React.useState(false)
  const [scope, setScope] = React.useState<"mine" | "all">("mine")
  const [selectedId, setSelectedId] = React.useState<string>(ALL)
  const [sort, setSort] = React.useState<Sort>("name")
  const wishlist = useWishlist(buyer.id)

  const flatMode = wishlistOnly || query.length > 0
  const flatResults = React.useMemo(() => {
    if (!flatMode) return []
    let result = listings
    if (wishlistOnly) result = result.filter((listing) => wishlist.includes(listing.id))
    if (query) {
      const needle = query.toLowerCase()
      result = result.filter((listing) =>
        [productLabel(listing.cropId), listing.variety, listing.sellerName, listing.region].join(" ").toLowerCase().includes(needle)
      )
    }
    return result
  }, [flatMode, listings, wishlistOnly, wishlist, query])

  const categories = React.useMemo(
    () =>
      CATALOG_CATEGORIES.map((category) => {
        const inCategory = listings.filter((listing) => listing.categoryId === category.id)
        if (inCategory.length === 0) return null
        return { category, listings: inCategory, forMe: inCategory.some((listing) => mySourcing.includes(listing.cropId)) }
      }).filter((entry) => entry !== null),
    [listings, mySourcing]
  )

  const canScope = mySourcing.length > 0 && categories.some((entry) => entry.forMe)
  const visible = canScope && scope === "mine" ? categories.filter((entry) => entry.forMe) : categories
  const activeId = selectedId === ALL || visible.some((entry) => entry.category.id === selectedId) ? selectedId : ALL

  const railItems: CategoryRailItem[] = React.useMemo(() => {
    const scoped = visible.flatMap((entry) => entry.listings)
    return [
      { id: ALL, label: "All", photos: visible.slice(0, 3).map((entry) => entry.listings[0].photo), count: scoped.length },
      ...visible.map((entry) => ({ id: entry.category.id, label: entry.category.label, photos: photosOf(entry.listings), count: entry.listings.length })),
    ]
  }, [visible])

  const products = React.useMemo(() => {
    const ids = new Set<string>(visible.map((entry) => entry.category.id))
    const scoped = listings.filter((listing) => (activeId === ALL ? ids.has(listing.categoryId) : listing.categoryId === activeId))
    const byProduct = new Map<string, Listing[]>()
    for (const listing of scoped) byProduct.set(listing.cropId, [...(byProduct.get(listing.cropId) ?? []), listing])
    const rows = [...byProduct.entries()].map(([cropId, group]) => ({
      cropId,
      categoryId: group[0].categoryId,
      label: productLabel(cropId),
      photo: group[0].photo,
      variantCount: new Set(group.map((listing) => slugify(listing.variety))).size,
      sellerCount: new Set(group.map((listing) => listing.sellerId)).size,
      minPrice: Math.min(...group.map((listing) => listing.pricePerTonneUsd)),
    }))
    return rows.sort((a, b) => (sort === "price" ? a.minPrice - b.minPrice : a.label.localeCompare(b.label)))
  }, [listings, activeId, visible, sort])

  /* The full rail scrolls away; its compact twin pins under the topbar. */
  const railRef = React.useRef<HTMLDivElement>(null)
  const resultsRef = React.useRef<HTMLDivElement>(null)
  const [pinned, setPinned] = React.useState(false)
  React.useEffect(() => {
    const node = railRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      ([entry]) => setPinned(!entry.isIntersecting && entry.boundingClientRect.top < STICK_AT),
      { rootMargin: `-${STICK_AT}px 0px 0px 0px`, threshold: 0 }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [flatMode])

  const clearQuery = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("q")
    const next = params.toString()
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false })
  }

  const selectCategory = (id: string) => {
    setSelectedId(id)
    if (pinned) resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-bold tracking-tight">Marketplace</h1>
        <div className="flex items-center gap-2">
          {canScope && !flatMode ? (
            <div className="flex items-center gap-1">
              <div role="radiogroup" aria-label="Categories shown" className="flex rounded-full border border-border bg-card p-0.5">
                {(["mine", "all"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={scope === value}
                    onClick={() => setScope(value)}
                    className={cn(
                      "h-8 rounded-full px-3.5 text-[12.5px] font-medium transition-colors",
                      scope === value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {value === "mine" ? "For you" : "All"}
                  </button>
                ))}
              </div>
              <InfoTip title="For you">
                Categories matching what you told us you buy.{" "}
                <Link href="/buyer/onboarding/sourcing?from=marketplace" className="font-medium text-amama-deep hover:underline">
                  Edit buying interests
                </Link>
              </InfoTip>
            </div>
          ) : null}
          <WishlistSwitch checked={wishlistOnly} onCheckedChange={setWishlistOnly} />
        </div>
      </div>

      {flatMode ? (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {query ? (
              <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-muted ps-3 pe-1 text-[12.5px] font-medium text-foreground">
                Results for &ldquo;{query}&rdquo;
                <button type="button" onClick={clearQuery} aria-label="Clear search" className="grid size-6 place-items-center rounded-full hover:bg-card">
                  <XIcon className="size-3.5" />
                </button>
              </span>
            ) : null}
            {wishlistOnly ? <span className="text-[12.5px] text-muted-foreground">Wishlist</span> : null}
            <span className="ms-auto text-[12px] text-muted-foreground tabular-nums">
              {flatResults.length} {flatResults.length === 1 ? "listing" : "listings"}
            </span>
          </div>
          {flatResults.length === 0 ? (
            <EmptyState message={query ? `Nothing matches "${query}".` : "Nothing saved to your wishlist yet."} />
          ) : (
            <motion.div layout className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              <AnimatePresence mode="popLayout">
                {flatResults.map((listing, index) => (
                  <motion.div
                    key={listing.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index, 8) * 0.03 } }}
                    exit={{ opacity: 0, scale: 0.96 }}
                  >
                    <ListingCard listing={listing} href={`/buyer/dashboard/sourcing/listing/${listing.id}`} personId={buyer.id} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </>
      ) : categories.length === 0 ? (
        <EmptyState message="No sellers have listed anything yet." />
      ) : (
        <>
          <div ref={railRef} className="mt-3">
            <CategoryRail items={railItems} selectedId={activeId} onSelect={selectCategory} />
          </div>

          <div className="sticky z-20 h-0" style={{ top: STICK_AT }}>
            <div
              className={cn(
                "absolute inset-x-0 top-0 transition-[opacity,transform] duration-200",
                pinned ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
              )}
            >
              <div aria-hidden className="pointer-events-none absolute -inset-x-4 -bottom-4 bg-gradient-to-b from-card via-card/90 to-transparent" style={{ top: -STICK_AT }} />
              <div className="relative">
                <CategoryChips items={railItems} selectedId={activeId} onSelect={selectCategory} />
              </div>
            </div>
          </div>

          <div ref={resultsRef} className="mt-4 flex scroll-mt-32 items-center justify-between gap-2">
            <p className="text-[13px] text-muted-foreground">
              <span className="font-semibold text-foreground tabular-nums">{products.length}</span> {products.length === 1 ? "product" : "products"}
              {activeId !== ALL ? ` in ${railItems.find((item) => item.id === activeId)?.label}` : ""}
            </p>
            <Select items={SORT_ITEMS} value={sort} onValueChange={(next) => next && setSort(next as Sort)}>
              <SelectTrigger size="sm" aria-label="Sort products" className="bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {(Object.keys(SORT_ITEMS) as Sort[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {SORT_ITEMS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {products.length === 0 ? (
            <EmptyState message="No sellers have listed anything in this category yet." />
          ) : (
            <motion.div layout className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              <AnimatePresence mode="popLayout">
                {products.map((product, index) => (
                  <motion.div
                    key={`${product.categoryId}-${product.cropId}`}
                    layout
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index, 8) * 0.035 } }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                  >
                    <CatalogTile
                      href={`/buyer/dashboard/sourcing/${product.categoryId}/${product.cropId}`}
                      photo={product.photo}
                      title={product.label}
                      subtitle={`${product.variantCount} ${product.variantCount === 1 ? "variant" : "variants"} · ${product.sellerCount} ${product.sellerCount === 1 ? "seller" : "sellers"}`}
                      meta={`from ${formatInr(product.minPrice)}/t`}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </>
      )}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mt-6 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border py-16 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-amama-subtle text-amama-deep">
        <StoreIcon className="size-5" strokeWidth={2.25} />
      </span>
      <p className="max-w-xs text-[14px] leading-relaxed text-muted-foreground">{message}</p>
    </div>
  )
}

/** `useSearchParams` reads `?q=`, so the page carries its own Suspense
 *  boundary. */
function SourcingView() {
  return (
    <React.Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-muted" />}>
      <SourcingWorkspace />
    </React.Suspense>
  )
}

export { SourcingView }
