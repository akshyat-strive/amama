"use client"

import * as React from "react"
import Link from "next/link"
import { PackageSearchIcon } from "lucide-react"

import { catalogCategory, productLabel, gradeSlug } from "@/features/marketplace/catalog"
import { formatInr } from "@/features/marketplace/currency"
import { useListings } from "@/features/marketplace/listing-store"
import { MarketplaceBreadcrumbs, SellerRow } from "@/features/marketplace/marketplace-ui"

type Sort = "price" | "volume"

/**
 * The bottom of the drill-down: every seller offering one product at one
 * grade, as offers from people — who, where, how much, at what price —
 * rather than product tiles. Each row goes on to the listing's own
 * connect/chat page.
 */
function VariantSellersView({ categoryId, productId, variantSlug }: { categoryId: string; productId: string; variantSlug: string }) {
  const category = catalogCategory(categoryId)
  const allListings = useListings()
  const [sort, setSort] = React.useState<Sort>("price")

  const listings = React.useMemo(
    () =>
      allListings
        .filter(
          (listing) =>
            listing.categoryId === categoryId &&
            listing.cropId === productId &&
            gradeSlug(listing.grade) === variantSlug &&
            listing.moderationStatus !== "flagged" &&
            !listing.deletedAt
        )
        .sort((a, b) => (sort === "price" ? a.pricePerTonneUsd - b.pricePerTonneUsd : b.quantityMt - a.quantityMt)),
    [allListings, categoryId, productId, variantSlug, sort]
  )

  const product = productLabel(productId)
  const grade = listings[0]?.grade || "Ungraded"

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[28px] bg-card py-16 text-center">
        <PackageSearchIcon className="size-6 text-muted-foreground" />
        <p className="text-[15px] font-semibold">Nobody offers this grade any more</p>
        <Link href={`/buyer/dashboard/sourcing/${categoryId}/${productId}`} className="text-[14px] font-medium text-amama-deep hover:underline">
          Back to {product}
        </Link>
      </div>
    )
  }

  const prices = listings.map((listing) => listing.pricePerTonneUsd)

  return (
    <div>
      <MarketplaceBreadcrumbs
        trail={[
          { label: "Marketplace", href: "/buyer/dashboard/sourcing" },
          { label: category.label, href: `/buyer/dashboard/sourcing/${categoryId}` },
          { label: product, href: `/buyer/dashboard/sourcing/${categoryId}/${productId}` },
          { label: grade },
        ]}
      />

      <header className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="inline-flex min-h-14 items-center rounded-2xl bg-amama px-5 text-[24px] font-semibold tracking-[-0.022em] text-white">{grade}</span>
          <div>
            <h1 className="text-[34px] font-semibold tracking-[-0.03em]">{product}</h1>
            <p className="text-[15px] text-muted-foreground">
              {listings.length} {listings.length === 1 ? "seller" : "sellers"} · {formatInr(Math.min(...prices))}
              {Math.max(...prices) > Math.min(...prices) ? ` – ${formatInr(Math.max(...prices))}` : ""}/t
            </p>
          </div>
        </div>
        <div role="radiogroup" aria-label="Sort sellers" className="flex rounded-full bg-card p-1">
          {(
            [
              ["price", "Lowest price"],
              ["volume", "Most available"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={sort === value}
              onClick={() => setSort(value)}
              className={sort === value ? "h-8 rounded-full bg-background px-3.5 text-[13px] font-medium ring-1 ring-border" : "h-8 rounded-full px-3.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <ul className="mt-8 flex flex-col gap-2.5">
        {listings.map((listing) => (
          <SellerRow key={listing.id} listing={listing} href={`/buyer/dashboard/sourcing/listing/${listing.id}`} />
        ))}
      </ul>
    </div>
  )
}

export { VariantSellersView }
