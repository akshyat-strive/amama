"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon, PackageSearchIcon } from "lucide-react"

import { catalogCategory, productLabel, slugify } from "@/features/marketplace/catalog"
import { CatalogTile } from "@/features/marketplace/catalog-tile"
import { formatInr } from "@/features/marketplace/currency"
import { useListings } from "@/features/marketplace/listing-store"

/** Level 2 of the drill-down: every product listed under one category
 *  ("Fruits" → Apple, Fresh fruit, Dried fruit), each tile leading to that
 *  product's own variants. */
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
        variantCount: new Set(group.map((listing) => slugify(listing.variety))).size,
        minPrice: Math.min(...group.map((listing) => listing.pricePerTonneUsd)),
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [listings])

  return (
    <div>
      <Link
        href="/buyer/dashboard/sourcing"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" />
        Marketplace
      </Link>

      <h1 className="mt-3 text-[28px] font-bold tracking-tight">{category.label}</h1>

      {products.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border py-16 text-center">
          <PackageSearchIcon className="size-6 text-muted-foreground" />
          <p className="text-[15px] font-semibold">No sellers here yet</p>
          <p className="max-w-xs text-[13px] leading-relaxed text-muted-foreground">
            Nobody has listed a product under {category.label.toLowerCase()} yet.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {products.map((product) => (
            <CatalogTile
              key={product.cropId}
              href={`/buyer/dashboard/sourcing/${categoryId}/${product.cropId}`}
              photo={product.photo}
              title={product.label}
              subtitle={`${product.variantCount} ${product.variantCount === 1 ? "variant" : "variants"}`}
              meta={`from ${formatInr(product.minPrice)}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export { CategoryProductsView }
