"use client"

import * as React from "react"
import { PackageSearchIcon } from "lucide-react"

import { catalogCategory, productLabel, gradeSlug } from "@/features/marketplace/catalog"
import { CatalogTile } from "@/features/marketplace/catalog-tile"
import { formatInr } from "@/features/marketplace/currency"
import { useListings } from "@/features/marketplace/listing-store"
import { MarketplaceBreadcrumbs } from "@/features/marketplace/marketplace-ui"

/** Level 2 of the drill-down: every product listed under one category
 *  ("Fruits" → Apple, Fresh fruit, Dried fruit), as photo tiles — each
 *  leading to the grades that product is offered at. */
function CategoryProductsView({ categoryId }: { categoryId: string }) {
  const category = catalogCategory(categoryId)
  const allListings = useListings()
  const listings = React.useMemo(
    () =>
      allListings.filter(
        (listing) =>
          listing.categoryId === categoryId && listing.moderationStatus !== "flagged" && !listing.deletedAt
      ),
    [allListings, categoryId]
  )

  const products = React.useMemo(() => {
    const byProduct = new Map<string, typeof listings>()
    for (const listing of listings) {
      const group = byProduct.get(listing.cropId)
      if (group) group.push(listing)
      else byProduct.set(listing.cropId, [listing])
    }
    return Array.from(byProduct.entries())
      .map(([cropId, group]) => ({
        cropId,
        label: productLabel(cropId),
        photo: group[0].photo,
        gradeCount: new Set(group.map((listing) => gradeSlug(listing.grade))).size,
        sellerCount: new Set(group.map((listing) => listing.sellerId)).size,
        minPrice: Math.min(...group.map((listing) => listing.pricePerTonneUsd)),
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [listings])

  return (
    <div>
      <MarketplaceBreadcrumbs trail={[{ label: "Marketplace", href: "/buyer/dashboard/sourcing" }, { label: category.label }]} />

      <h1 className="mt-4 text-[34px] font-semibold tracking-[-0.03em] sm:text-[40px]">{category.label}</h1>
      <p className="mt-1 text-[15px] text-muted-foreground">
        {products.length} {products.length === 1 ? "product" : "products"}
      </p>

      {products.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-[28px] bg-card py-16 text-center">
          <PackageSearchIcon className="size-6 text-muted-foreground" />
          <p className="text-[15px] font-semibold">No sellers here yet</p>
          <p className="max-w-xs text-[13px] leading-relaxed text-muted-foreground">
            Nobody has listed a product under {category.label.toLowerCase()} yet.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {products.map((product) => (
            <CatalogTile
              key={product.cropId}
              href={`/buyer/dashboard/sourcing/${categoryId}/${product.cropId}`}
              photo={product.photo}
              title={product.label}
              subtitle={`${product.gradeCount} ${product.gradeCount === 1 ? "grade" : "grades"} · ${product.sellerCount} ${product.sellerCount === 1 ? "seller" : "sellers"}`}
              meta={`from ${formatInr(product.minPrice)}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export { CategoryProductsView }
