"use client"

import * as React from "react"
import Link from "next/link"
import { PackageSearchIcon } from "lucide-react"

import { ButtonGroup } from "@/components/ui/button-group"
import { DetailColumnCard } from "@/components/ui/column-card"
import { catalogCategory, productLabel, gradeSlug } from "@/features/marketplace/catalog"
import { formatInr } from "@/features/marketplace/currency"
import { useListings } from "@/features/marketplace/listing-store"
import { SellerRow } from "@/features/marketplace/marketplace-ui"

type Sort = "price" | "volume"

/**
 * The bottom of the drill-down: every seller offering one product at one
 * grade, as offers from people — who, where, how much, at what price —
 * rather than product tiles. Each row goes on to the listing's own
 * connect/chat page.
 */
function VariantSellersView({ categoryId, productId, variantSlug }: { categoryId: string; productId: string; variantSlug: string }) {
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
  const category = catalogCategory(categoryId)
  const grade = listings[0]?.grade || "Ungraded"
  const crumbs = [
    { label: "Marketplace", href: "/buyer/dashboard/sourcing" },
    { label: category.label, href: `/buyer/dashboard/sourcing/${categoryId}` },
    { label: product, href: `/buyer/dashboard/sourcing/${categoryId}/${productId}` },
  ]

  if (listings.length === 0) {
    return (
      <DetailColumnCard backHref={`/buyer/dashboard/sourcing/${categoryId}/${productId}`} backLabel={product} crumbs={crumbs} title="Grade unavailable">
        <div className="flex flex-col items-center gap-3 rounded-[20px] bg-card py-16 text-center">
          <PackageSearchIcon className="size-6 text-muted-foreground" />
          <p className="text-[15px] font-semibold">Nobody offers this grade any more</p>
          <Link href={`/buyer/dashboard/sourcing/${categoryId}/${productId}`} className="text-[14px] font-medium text-amama-deep hover:underline">
            Back to {product}
          </Link>
        </div>
      </DetailColumnCard>
    )
  }

  const prices = listings.map((listing) => listing.pricePerTonneUsd)

  return (
    <DetailColumnCard
      backHref={`/buyer/dashboard/sourcing/${categoryId}/${productId}`}
      backLabel={product}
      crumbs={crumbs}
      title={grade}
      meta={`${listings.length} ${listings.length === 1 ? "seller" : "sellers"} · ${formatInr(Math.min(...prices))}${Math.max(...prices) > Math.min(...prices) ? ` – ${formatInr(Math.max(...prices))}` : ""}/t`}
      action={
        <ButtonGroup
          label="Sort sellers"
          size="sm"
          value={sort}
          onChange={setSort}
          options={[
            { value: "price", label: "Lowest price" },
            { value: "volume", label: "Most available" },
          ]}
        />
      }
    >
      <ul className="flex flex-col">
        {listings.map((listing) => (
          <SellerRow key={listing.id} listing={listing} href={`/buyer/dashboard/sourcing/listing/${listing.id}`} />
        ))}
      </ul>
    </DetailColumnCard>
  )
}

export { VariantSellersView }
