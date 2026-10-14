"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { StoreIcon, XIcon } from "lucide-react"

import { ButtonGroup } from "@/components/ui/button-group"
import { ColumnCard } from "@/components/ui/column-card"
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
  const incoterm = draft.buyer.incoterm

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

  const clearQuery = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("q")
    const next = params.toString()
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false })
  }

  const selectCategory = (id: string) => setSelectedId(id)

  return (
    <ColumnCard
      title="Marketplace"
      action={
        <div className="flex items-center gap-2">
          {canScope && !flatMode ? (
            <ButtonGroup
              label="Products shown"
              value={scope}
              onChange={setScope}
              options={[
                { value: "all", label: "All products" },
                { value: "mine", label: "My interests" },
              ]}
            />
          ) : null}
          <WishlistSwitch checked={wishlistOnly} onCheckedChange={setWishlistOnly} />
        </div>
      }
      // Categories sit right under the title, fixed in the header, while
      // the products scroll beneath.
      toolbar={!flatMode && categories.length > 0 ? <CategoryTabs items={railItems} selectedId={activeId} onSelect={selectCategory} /> : undefined}
    >
      {flatMode ? (
        <>
          <div className="flex flex-wrap items-center gap-2 px-1">
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
          <div ref={resultsRef} className="mt-1.5 flex scroll-mt-14 items-center justify-between gap-2 px-1">
            <p className="text-[13px] text-muted-foreground">
              <span className="font-semibold text-foreground tabular-nums">{products.length}</span> {products.length === 1 ? "product" : "products"}
              {activeId !== ALL ? ` in ${railItems.find((item) => item.id === activeId)?.label}` : ""}
              {" · "}
              {incoterm && incoterm !== "notSure" ? `${incoterm.toUpperCase()} · ` : ""}
              <Link href="/buyer/onboarding/sourcing?from=marketplace" className="font-medium text-amama-deep hover:underline">
                {preferences?.products.length || preferences?.grades.length || preferences?.categories.length ? "Matched to your picks" : "Set preferences"}
              </Link>
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
            <ProductGrid products={products} />
          )}
        </>
      )}
    </ColumnCard>
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
