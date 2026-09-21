"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon, PackageSearchIcon } from "lucide-react"

import { catalogCategory, productLabel, slugify } from "@/features/marketplace/catalog"
import { CatalogTile } from "@/features/marketplace/catalog-tile"
import { formatInr } from "@/features/marketplace/currency"
import { useListings } from "@/features/marketplace/listing-store"

/** Level 3 of the drill-down: every distinct variant of one product
 *  ("Apple" → Kashmiri Apple, Shimla Royal Gala), grouped by a normalized
 *  read of each listing's free-text `variety` (`slugify`) so two sellers
 *  spelling the same variety slightly differently still land in one
 *  tile. */
function ProductVariantsView({ categoryId, productId }: { categoryId: string; productId: string }) {
  const category = catalogCategory(categoryId)
  const allListings = useListings()
  const listings = React.useMemo(
    () =>
      allListings.filter(
        (listing) =>
          listing.categoryId === categoryId &&
          listing.cropId === productId &&
          listing.moderationStatus !== "flagged" &&
          !listing.deletedAt
      ),
    [allListings, categoryId, productId]
  )

  const variants = React.useMemo(() => {
    const byVariant = new Map<string, typeof listings>()
    for (const listing of listings) {
      const key = slugify(listing.variety)
      const group = byVariant.get(key)
      if (group) group.push(listing)
      else byVariant.set(key, [listing])
    }
    return Array.from(byVariant.entries())
      .map(([slug, group]) => ({
        slug,
        // The first seller's own spelling/casing stands in for the group —
        // arbitrary, but stable, and always a real seller's real words
        // rather than a normalized-and-therefore-slightly-wrong label.
        label: group[0].variety,
        photo: group[0].photo,
        sellerCount: group.length,
        minPrice: Math.min(...group.map((listing) => listing.pricePerTonneUsd)),
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [listings])

  return (
    <div>
      <Link
        href={`/buyer/dashboard/sourcing/${categoryId}`}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" />
        {category.label}
      </Link>

      <h1 className="mt-3 text-[28px] font-bold tracking-tight">{productLabel(productId)}</h1>

      {variants.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border py-16 text-center">
          <PackageSearchIcon className="size-6 text-muted-foreground" />
          <p className="text-[15px] font-semibold">No sellers here yet</p>
          <p className="max-w-xs text-[13px] leading-relaxed text-muted-foreground">
            Nobody has listed a variant of {productLabel(productId)} yet.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {variants.map((variant) => (
            <CatalogTile
              key={variant.slug}
              href={`/buyer/dashboard/sourcing/${categoryId}/${productId}/${variant.slug}`}
              photo={variant.photo}
              title={variant.label}
              subtitle={`${variant.sellerCount} ${variant.sellerCount === 1 ? "seller" : "sellers"}`}
              meta={`from ${formatInr(variant.minPrice)}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export { ProductVariantsView }
