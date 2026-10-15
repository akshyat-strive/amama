"use client"

import * as React from "react"
import { PackageSearchIcon } from "lucide-react"

import { DetailColumnCard } from "@/components/ui/column-card"
import { catalogCategory, productLabel, gradeSlug } from "@/features/marketplace/catalog"
import { CatalogTile } from "@/features/marketplace/catalog-tile"
import { formatInr } from "@/features/marketplace/currency"
import { useListings } from "@/features/marketplace/listing-store"

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
    <DetailColumnCard
      backHref="/buyer/dashboard/sourcing"
      backLabel="Marketplace"
      crumbs={[{ label: "Marketplace", href: "/buyer/dashboard/sourcing" }]}
      title={category.label}
    >
      {products.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[20px] bg-card py-16 text-center">
          <PackageSearchIcon className="size-6 text-muted-foreground" />
          <p className="text-[15px] font-semibold">No sellers here yet</p>
          <p className="max-w-xs text-[13px] leading-relaxed text-muted-foreground">
            Nobody has listed a product under {category.label.toLowerCase()} yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
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
    </DetailColumnCard>
  )
}

export { CategoryProductsView }
