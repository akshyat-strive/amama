"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ChevronDownIcon, ChevronRightIcon, PackageSearchIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { EntityLink } from "@/features/internal/entity-link"
import {
  Dot,
  EmptyState,
  Eyebrow,
  Group,
  Metric,
  Metrics,
  PageHead,
  Pill,
  Row,
  Rows,
  TableHead,
  type Tone,
} from "@/features/internal/tower-ui"
import * as W from "@/features/tradechain/demo-world"

/**
 * The catalog, walked the way a trader walks it: category → product →
 * variant → the sellers actually offering that variant today.
 *
 * The fourth level is the one that matters. A product row that stops at
 * "Apple · 3 variants" is a brochure; the moment you can see that four
 * growers are offering Royal Delicious at USD 1,140–1,175 with 12–14 day
 * lead times, it is a sourcing decision. So every leaf row here is a real
 * seller offer, and every id on it opens in the peek panel.
 *
 * One island per category, and the expansion happens inside it — the
 * island's edge is the only boundary on the screen, so a variant opening
 * underneath a product reads as part of the same object rather than as a
 * new box.
 */

/* Static indexes, built once at module load rather than per render —
   293 listings scanned on every keystroke of an expand/collapse is waste
   the browser has no reason to do. */
const LISTINGS_BY_PRODUCT = new Map<string, W.Listing[]>()
const LISTINGS_BY_VARIANT = new Map<string, W.Listing[]>()
const LISTINGS_BY_CATEGORY = new Map<string, number>()

for (const listing of W.LISTINGS) {
  const byProduct = LISTINGS_BY_PRODUCT.get(listing.productId)
  if (byProduct) byProduct.push(listing)
  else LISTINGS_BY_PRODUCT.set(listing.productId, [listing])

  const byVariant = LISTINGS_BY_VARIANT.get(listing.variantId)
  if (byVariant) byVariant.push(listing)
  else LISTINGS_BY_VARIANT.set(listing.variantId, [listing])

  LISTINGS_BY_CATEGORY.set(listing.categoryId, (LISTINGS_BY_CATEGORY.get(listing.categoryId) ?? 0) + 1)
}

const listingsForProduct = (productId: string): W.Listing[] => LISTINGS_BY_PRODUCT.get(productId) ?? []
const listingsForVariant = (variantId: string): W.Listing[] => LISTINGS_BY_VARIANT.get(variantId) ?? []

const lowestPrice = (listings: W.Listing[]): number | null =>
  listings.length === 0 ? null : listings.reduce((low, row) => Math.min(low, row.priceUsdPerMt), Infinity)

const usd = (value: number): string => `USD ${value.toLocaleString("en-US")}`

const STATUS_TONE: Record<W.Listing["status"], Tone> = {
  available: "ok",
  "pre-season": "muted",
  committed: "warn",
}

/* ── the seller offers under one variant ──────────────────────────── */

function VariantBlock({ variant }: { variant: W.Variant }) {
  const offers = [...listingsForVariant(variant.id)].sort((a, b) => a.priceUsdPerMt - b.priceUsdPerMt)

  return (
    <div className="ps-6">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-3 pt-2.5 pb-1">
        <EntityLink kind="variant" id={variant.id} mono={false} className="text-[13px] font-semibold" />
        <span className="text-[12px] text-muted-foreground">{variant.spec}</span>
        <span className="ms-auto font-mono text-[11px] text-muted-foreground tabular-nums">{offers.length}</span>
      </div>

      {offers.length === 0 ? (
        <Row>
          <Pill tone="muted">No live offer</Pill>
        </Row>
      ) : (
        <Rows>
          {offers.map((listing) => {
            const seller = W.sellerById(listing.sellerId)
            return (
              <Row key={listing.id}>
                <Dot tone={STATUS_TONE[listing.status]} />

                <span className="min-w-0 flex-1 basis-40">
                  <EntityLink
                    kind="seller"
                    id={listing.sellerId}
                    mono={false}
                    className="text-[13px] font-medium"
                  />
                  {seller ? (
                    <span className="ms-2 text-[11px] text-muted-foreground">
                      {seller.district}, {seller.state}
                    </span>
                  ) : null}
                </span>

                <EntityLink
                  kind="listing"
                  id={listing.id}
                  mono={false}
                  className="w-28 shrink-0 text-end text-[13px] font-semibold tabular-nums"
                >
                  {usd(listing.priceUsdPerMt)}
                </EntityLink>
                <span className="hidden w-20 shrink-0 text-end text-[12px] text-muted-foreground tabular-nums sm:block">
                  {listing.availableMt} MT
                </span>
                <span className="hidden w-14 shrink-0 text-end text-[12px] text-muted-foreground sm:block">
                  {listing.incoterm}
                </span>
                <span className="hidden w-14 shrink-0 text-end text-[12px] text-muted-foreground tabular-nums sm:block">
                  {listing.leadTimeDays} d
                </span>
                <Pill tone={STATUS_TONE[listing.status]} className="hidden sm:inline-flex">
                  {listing.status}
                </Pill>
              </Row>
            )
          })}
        </Rows>
      )}
    </div>
  )
}

/* ── one product, expandable into its variants ────────────────────── */

function ProductRow({ product }: { product: W.Product }) {
  const [open, setOpen] = React.useState(false)
  const variants = W.variantsForProduct(product.id)
  const offers = listingsForProduct(product.id)
  const from = lowestPrice(offers)

  return (
    <div>
      <Row className={cn(open && "bg-muted")}>
        <span className="min-w-0 flex-1 basis-40">
          <EntityLink kind="product" id={product.id} mono={false} className="text-[14px] font-semibold" />
          <span className="ms-2 font-mono text-[11px] text-muted-foreground">HS {product.hsCode}</span>
        </span>

        <span className="hidden w-20 shrink-0 text-end text-[12px] text-muted-foreground tabular-nums sm:block">
          {variants.length}
        </span>
        <span className="hidden w-24 shrink-0 text-end text-[12px] text-muted-foreground tabular-nums sm:block">
          {offers.length}
        </span>
        <span className="w-32 shrink-0 text-end text-[13px] font-semibold tabular-nums">
          {from === null ? "—" : usd(from)}
        </span>
        <span className="hidden w-20 shrink-0 text-end text-[12px] text-muted-foreground tabular-nums sm:block">
          {product.setpointC} °C
        </span>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? `Collapse ${product.label}` : `Expand ${product.label}`}
          className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
        >
          <ChevronDownIcon className={cn("size-4 transition-transform", open && "rotate-180")} />
        </button>
      </Row>

      {open ? (
        <div className="pb-2">
          {variants.map((variant) => (
            <VariantBlock key={variant.id} variant={variant} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

/* ── the product table for one category ───────────────────────────── */

function ProductTable({ category }: { category: W.CatalogCategory }) {
  const products = W.productsForCategory(category.id)

  return (
    <Group
      label={category.label}
      count={`${products.length} products · ${LISTINGS_BY_CATEGORY.get(category.id) ?? 0} offers`}
      pad="tight"
    >
      <TableHead className="pt-2">
        <Eyebrow className="min-w-0 flex-1 basis-40">Product</Eyebrow>
        <Eyebrow className="hidden w-20 shrink-0 text-end sm:block">Variants</Eyebrow>
        <Eyebrow className="hidden w-24 shrink-0 text-end sm:block">Offers</Eyebrow>
        <Eyebrow className="w-32 shrink-0 text-end">Lowest</Eyebrow>
        <Eyebrow className="hidden w-20 shrink-0 text-end sm:block">Set point</Eyebrow>
        <span aria-hidden className="w-6 shrink-0" />
      </TableHead>

      <Rows>
        {products.map((product) => (
          <ProductRow key={product.id} product={product} />
        ))}
      </Rows>
    </Group>
  )
}

/* ── the browser itself ───────────────────────────────────────────── */

function MarketplaceBrowser() {
  const searchParams = useSearchParams()
  const categoryId = searchParams.get("category")
  const category = W.CATEGORIES.find((entry) => entry.id === categoryId) ?? null

  return (
    <>
      <PageHead
        title="Marketplace"
        meta={category ? <Pill tone="brand">{category.label}</Pill> : null}
      />

      <Metrics>
        <Metric label="Categories" value={W.CATEGORIES.length} />
        <Metric label="Products" value={W.PRODUCTS.length} />
        <Metric label="Variants" value={W.VARIANTS.length} />
        <Metric label="Live offers" value={W.LISTINGS.length} tone="brand" />
      </Metrics>

      <Group label="Filter" pad="tight">
        <div className="flex flex-wrap gap-1.5 p-2">
          <Link
            href="/internal/marketplace"
            className={cn(
              "rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors",
              category === null ? "bg-amama text-amama-foreground" : "bg-muted hover:bg-amama-subtle"
            )}
          >
            All
          </Link>
          {W.CATEGORIES.map((entry) => (
            <Link
              key={entry.id}
              href={`/internal/marketplace?category=${entry.id}`}
              className={cn(
                "rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                category?.id === entry.id ? "bg-amama text-amama-foreground" : "bg-muted hover:bg-amama-subtle"
              )}
            >
              {entry.label}
            </Link>
          ))}
        </div>
      </Group>

      {category === null ? (
        <Group label="Categories" count={W.CATEGORIES.length} pad="tight">
          <Rows>
            {W.CATEGORIES.map((entry) => (
              <Row key={entry.id} href={`/internal/marketplace?category=${entry.id}`}>
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{entry.label}</span>
                <span className="w-24 shrink-0 text-end text-[12px] text-muted-foreground tabular-nums">
                  {W.productsForCategory(entry.id).length} products
                </span>
                <span className="w-24 shrink-0 text-end text-[12px] text-muted-foreground tabular-nums">
                  {LISTINGS_BY_CATEGORY.get(entry.id) ?? 0} offers
                </span>
                <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
              </Row>
            ))}
          </Rows>
        </Group>
      ) : W.productsForCategory(category.id).length === 0 ? (
        <Group label={category.label}>
          <EmptyState icon={PackageSearchIcon} title="Nothing listed in this category" />
        </Group>
      ) : (
        /* Keyed on the category so expanding a product in Fruits does not
           leave a stale open row behind when you switch to Spices. */
        <ProductTable key={category.id} category={category} />
      )}
    </>
  )
}

/**
 * `useSearchParams` opts the tree below it out of prerendering, so it sits
 * under its own boundary here rather than relying on every route that
 * renders this view to remember to add one.
 */
function MarketplaceView() {
  return (
    <React.Suspense fallback={<div className="h-64 animate-pulse rounded-[24px] bg-card" />}>
      <MarketplaceBrowser />
    </React.Suspense>
  )
}

export { MarketplaceView }
