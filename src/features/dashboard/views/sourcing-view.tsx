"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { CheckIcon, ChevronDownIcon, SearchIcon, SlidersHorizontalIcon, StoreIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ColumnCard } from "@/components/ui/column-card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CATALOG_CATEGORIES, productLabel, slugify, gradeSlug } from "@/features/marketplace/catalog"
import { CategoryTabs } from "@/features/marketplace/marketplace-ui"
import { CatalogTile } from "@/features/marketplace/catalog-tile"
import { formatInr } from "@/features/marketplace/currency"
import { ListingCard } from "@/features/marketplace/listing-card"
import { buyerIdentity } from "@/features/marketplace/identity"
import { useListings, type Listing } from "@/features/marketplace/listing-store"
import { useWishlist } from "@/features/marketplace/wishlist-store"
import { WishlistSwitch } from "@/features/marketplace/wishlist-switch"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import { ORDER_SIZE_MIN_MT, type orderSizes } from "@/features/onboarding/steps"

const ALL = "all"

type Sort = "name" | "price"
const SORT_ITEMS: Record<Sort, string> = { name: "Name A–Z", price: "Lowest price" }

/**
 * The marketplace, one white column: categories as text tabs pinned to
 * the top of the card —
 * readable however many there are — over a grid of product photo tiles.
 * From a product, the drill-down goes to its grades, then to the sellers
 * offering that grade, with breadcrumbs back up. Search is the topbar's —
 * pressing Enter there on this page lands back here with `?q=`, which
 * switches the grid to matching listings.
 */
function SourcingWorkspace() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const query = searchParams.get("q")?.trim() ?? ""
  const { draft } = useOnboarding()
  const buyer = buyerIdentity(draft.buyer)
  const mySourcing = draft.buyer.sourcing
  const preferences = draft.buyer.preferences

  /** Products the buyer told us they buy — picked outright, or through
   *  one of their varieties or grades. */
  const interests = React.useMemo(
    () =>
      new Set([
        ...mySourcing,
        ...(preferences?.products ?? []).map((id) => id.split("/")[0]),
        ...(preferences?.grades ?? []).filter((grade) => grade.includes("::")).map((grade) => grade.split("::")[0]),
      ]),
    [mySourcing, preferences]
  )
  const categoryInterests = React.useMemo(() => new Set(preferences?.categories ?? []), [preferences])
  const isInterest = React.useCallback(
    (listing: Listing) => interests.has(listing.cropId) || categoryInterests.has(listing.categoryId),
    [interests, categoryInterests]
  )

  /** How well a listing fits what the buyer picked: its exact variety,
   *  its product, its grade (for that product or any), its category, and
   *  whether it can fill their usual order. Higher first; it only orders
   *  things, never hides them. */
  const fit = React.useCallback(
    (listing: Listing) => {
      const products = preferences?.products ?? []
      const grades = preferences?.grades ?? []
      const minMt = preferences?.orderSize ? (ORDER_SIZE_MIN_MT[preferences.orderSize as (typeof orderSizes)[number]] ?? 0) : null
      return (
        (products.includes(`${listing.cropId}/${slugify(listing.variety)}`) ? 30 : 0) +
        (grades.includes(`${listing.cropId}::${listing.grade}`) || grades.includes(`${listing.cropId}::${listing.variety}`) ? 20 : grades.includes(listing.grade) ? 8 : 0) +
        (interests.has(listing.cropId) ? 10 : 0) +
        (categoryInterests.has(listing.categoryId) ? 5 : 0) +
        (minMt !== null && listing.quantityMt >= minMt ? 1 : 0)
      )
    },
    [preferences, interests, categoryInterests]
  )

  const allListings = useListings()
  const listings = React.useMemo(
    () => allListings.filter((listing) => listing.moderationStatus !== "flagged" && !listing.deletedAt),
    [allListings]
  )

  const [wishlistOnly, setWishlistOnly] = React.useState(false)
  const [scope, setScope] = React.useState<"all" | "mine">("all")
  const [selectedId, setSelectedId] = React.useState<string>(ALL)
  const [filtersOpen, setFiltersOpen] = React.useState(false)
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
    return [...result].sort((a, b) => fit(b) - fit(a))
  }, [flatMode, listings, wishlistOnly, wishlist, query, fit])

  const categories = React.useMemo(
    () =>
      CATALOG_CATEGORIES.map((category) => {
        const inCategory = listings.filter((listing) => listing.categoryId === category.id)
        if (inCategory.length === 0) return null
        return { category, listings: inCategory, forMe: inCategory.some(isInterest) }
      }).filter((entry) => entry !== null),
    [listings, isInterest]
  )

  const canScope = categories.some((entry) => entry.forMe)
  const mine = canScope && scope === "mine"
  // "All products" keeps every category, the buyer's own leading the rail;
  // "My interests" keeps only those.
  const visible = React.useMemo(() => {
    const ordered = [...categories].sort((a, b) => Number(b.forMe) - Number(a.forMe))
    return mine ? ordered.filter((entry) => entry.forMe) : ordered
  }, [categories, mine])
  const activeId = selectedId === ALL || visible.some((entry) => entry.category.id === selectedId) ? selectedId : ALL

  const railItems = React.useMemo(() => {
    const productCount = (group: Listing[]) => new Set(group.map((listing) => listing.cropId)).size
    return [
      { id: ALL, label: "All", count: productCount(visible.flatMap((entry) => entry.listings)) },
      ...visible.map((entry) => ({ id: entry.category.id, label: entry.category.label, count: productCount(entry.listings) })),
    ]
  }, [visible])

  const products = React.useMemo(() => {
    const ids = new Set<string>(visible.map((entry) => entry.category.id))
    const scoped = listings.filter(
      (listing) =>
        (activeId === ALL ? ids.has(listing.categoryId) : listing.categoryId === activeId) && (!mine || isInterest(listing))
    )
    const byProduct = new Map<string, Listing[]>()
    for (const listing of scoped) byProduct.set(listing.cropId, [...(byProduct.get(listing.cropId) ?? []), listing])
    const rows = [...byProduct.entries()].map(([cropId, group]) => ({
      cropId,
      fit: Math.max(...group.map(fit)),
      gradeMatch: group.some((listing) =>
        [listing.grade, `${listing.cropId}::${listing.grade}`, `${listing.cropId}::${listing.variety}`].some((grade) => preferences?.grades.includes(grade))
      ),
      categoryId: group[0].categoryId,
      label: productLabel(cropId),
      photo: group[0].photo,
      gradeCount: new Set(group.map((listing) => gradeSlug(listing.grade))).size,
      sellerCount: new Set(group.map((listing) => listing.sellerId)).size,
      minPrice: Math.min(...group.map((listing) => listing.pricePerTonneUsd)),
    }))
    return rows.sort((a, b) => b.fit - a.fit || (sort === "price" ? a.minPrice - b.minPrice : a.label.localeCompare(b.label)))
  }, [listings, activeId, visible, sort, fit, preferences, mine, isInterest])

  const resultsRef = React.useRef<HTMLDivElement>(null)

  const setQuery = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set("q", value)
    else params.delete("q")
    const next = params.toString()
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false })
  }
  const clearQuery = () => setQuery("")

  const selectCategory = (id: string) => setSelectedId(id)

  const SCOPES = { all: "All products", mine: "My preferences" } as const

  return (
    <>
    <ColumnCard
      title="Marketplace"
      heading={
        <div className="flex items-center gap-2">
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl bg-card px-3 text-muted-foreground focus-within:ring-2 focus-within:ring-ring/30 sm:max-w-md">
          <SearchIcon aria-hidden className="size-4 shrink-0" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products, grades, sellers"
            aria-label="Search the marketplace"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button type="button" onClick={clearQuery} aria-label="Clear search" className="grid size-6 shrink-0 place-items-center rounded-full hover:bg-muted">
              <XIcon className="size-3.5" />
            </button>
          ) : null}
        </label>
        {/* On a phone the filters live in a bottom sheet. */}
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          aria-label="Filters"
          className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-card text-foreground transition-colors hover:bg-muted sm:hidden"
        >
          <SlidersHorizontalIcon aria-hidden className="size-[18px]" />
          {scope === "mine" || wishlistOnly || sort !== "name" ? <span aria-hidden className="absolute end-2 top-2 size-2 rounded-full bg-amama-deep ring-2 ring-card" /> : null}
        </button>
        </div>
      }
      action={
        <div className="flex items-center gap-2">
          {canScope && !flatMode ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Products shown"
                className="inline-flex h-9 min-w-0 items-center gap-1.5 rounded-xl bg-card px-3 text-[13.5px] font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30"
              >
                <SlidersHorizontalIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  <span className="sm:hidden">{scope === "all" ? "All" : "Mine"}</span>
                  <span className="hidden sm:inline">{SCOPES[scope]}</span>
                </span>
                <ChevronDownIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-48 p-1">
                {(Object.keys(SCOPES) as (keyof typeof SCOPES)[]).map((key) => (
                  <DropdownMenuItem key={key} onClick={() => setScope(key)} className="justify-between gap-3 py-2 text-[13.5px]">
                    {SCOPES[key]}
                    <CheckIcon aria-hidden className={cn("size-3.5 text-amama-deep", scope === key ? "opacity-100" : "opacity-0")} />
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href="/buyer/onboarding/sourcing?from=marketplace" />} className="py-2 text-[13.5px]">
                  {preferences?.products.length || preferences?.grades.length || preferences?.categories.length ? "Edit my preferences" : "Set my preferences"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          <div className="flex items-center gap-2">
            <WishlistSwitch checked={wishlistOnly} onCheckedChange={setWishlistOnly} />
            {!flatMode && categories.length > 0 ? (
              <Select items={SORT_ITEMS} value={sort} onValueChange={(next) => next && setSort(next as Sort)}>
                <SelectTrigger size="sm" aria-label="Sort products" className="h-9 rounded-xl border-transparent bg-card">
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
            ) : null}
          </div>
        </div>
      }
    >
      {flatMode ? (
        <>
          <div className="flex flex-wrap items-center gap-2 px-1">
            {query ? (
              <span className="text-[13px] text-muted-foreground">
                Results for <span className="font-medium text-foreground">&ldquo;{query}&rdquo;</span>
              </span>
            ) : null}
            {wishlistOnly ? <span className="text-[13px] text-muted-foreground">{query ? "· " : ""}Wishlist</span> : null}
            <span className="ms-auto text-[12px] text-muted-foreground tabular-nums">
              {flatResults.length} {flatResults.length === 1 ? "listing" : "listings"}
            </span>
          </div>
          {flatResults.length === 0 ? (
            <EmptyState message={query ? `Nothing matches "${query}".` : "Nothing saved to your wishlist yet."} />
          ) : (
            <motion.div layout className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
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
          {/* Categories sit just under the header's divider and stay put
              while the products scroll beneath. */}
          <div ref={resultsRef} className="sticky top-0 z-20 -mx-1.5 -mt-1.5 bg-background px-3 pt-0.5">
            <CategoryTabs items={railItems} selectedId={activeId} onSelect={selectCategory} />
            <div aria-hidden className="mt-2 h-px bg-border" />
          </div>

          {products.length === 0 ? (
            <EmptyState message="No sellers have listed anything in this category yet." />
          ) : (
            <div className="pt-1">
              <ProductGrid products={products} />
            </div>
          )}
        </>
      )}
    </ColumnCard>

    <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
      <SheetContent side="responsive" className="overflow-y-auto sm:max-w-sm">
        <div className="flex flex-col gap-6 pb-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-semibold tracking-[-0.02em]">Filters</h2>
            <SheetClose aria-label="Close filters" className="grid size-9 place-items-center rounded-full bg-card text-foreground/75 transition-colors hover:bg-muted">
              <XIcon aria-hidden className="size-4" />
            </SheetClose>
          </div>

          {canScope && !flatMode ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-[13px] font-medium text-muted-foreground">Products shown</legend>
              {(Object.keys(SCOPES) as (keyof typeof SCOPES)[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={scope === key}
                  onClick={() => setScope(key)}
                  className={cn(
                    "flex h-12 items-center justify-between rounded-2xl px-4 text-[15px] font-medium transition-colors",
                    scope === key ? "bg-graphite text-white" : "bg-card text-foreground"
                  )}
                >
                  {SCOPES[key]}
                  {scope === key ? <CheckIcon aria-hidden className="size-4" /> : null}
                </button>
              ))}
              <Link href="/buyer/onboarding/sourcing?from=marketplace" className="mt-1 text-[13.5px] font-medium text-amama-deep">
                {preferences?.products.length || preferences?.grades.length || preferences?.categories.length ? "Edit my preferences" : "Set my preferences"}
              </Link>
            </fieldset>
          ) : null}

          <div className="flex items-center justify-between gap-4 rounded-2xl bg-card px-4 py-3">
            <span>
              <span className="block text-[15px] font-medium">Wishlist only</span>
              <span className="block text-[12.5px] text-muted-foreground">Show just the listings you saved</span>
            </span>
            <WishlistSwitch checked={wishlistOnly} onCheckedChange={setWishlistOnly} />
          </div>

          {!flatMode && categories.length > 0 ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-[13px] font-medium text-muted-foreground">Sort by</legend>
              <div className="flex gap-2">
                {(Object.keys(SORT_ITEMS) as Sort[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={sort === key}
                    onClick={() => setSort(key)}
                    className={cn("h-11 flex-1 rounded-2xl text-[14.5px] font-medium transition-colors", sort === key ? "bg-graphite text-white" : "bg-card text-foreground")}
                  >
                    {SORT_ITEMS[key]}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}

          <Button className="w-full" onClick={() => setFiltersOpen(false)}>
            Show products
          </Button>
        </div>
      </SheetContent>
    </Sheet>
    </>
  )
}

type ProductRow = {
  cropId: string
  categoryId: string
  label: string
  photo: string
  gradeCount: number
  sellerCount: number
  minPrice: number
  gradeMatch: boolean
}

function ProductGrid({ products }: { products: ProductRow[] }) {
  return (
    <motion.div layout className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
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
              subtitle={
                product.gradeMatch
                  ? `Your grade · ${product.sellerCount} ${product.sellerCount === 1 ? "seller" : "sellers"}`
                  : `${product.gradeCount} ${product.gradeCount === 1 ? "grade" : "grades"} · ${product.sellerCount} ${product.sellerCount === 1 ? "seller" : "sellers"}`
              }
              meta={`from ${formatInr(product.minPrice)}/t`}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mt-3 flex flex-col items-center gap-3 rounded-[20px] bg-card py-16 text-center">
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
    <React.Suspense
      fallback={
        <ColumnCard title="Marketplace">
          <div className="h-64 animate-pulse rounded-[16px] bg-muted" />
        </ColumnCard>
      }
    >
      <SourcingWorkspace />
    </React.Suspense>
  )
}

export { SourcingView }
