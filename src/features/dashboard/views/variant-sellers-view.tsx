"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon, PackageSearchIcon } from "lucide-react"

import { productLabel, slugify } from "@/features/marketplace/catalog"
import { ListingCard } from "@/features/marketplace/listing-card"
import { buyerIdentity } from "@/features/marketplace/identity"
import { useListings } from "@/features/marketplace/listing-store"
import { useOnboarding } from "@/features/onboarding/onboarding-context"

/** The bottom of the drill-down: every seller offering exactly this variant
 *  ("Kashmiri Apple" → however many sellers), reusing the same
 *  `ListingCard` the old flat marketplace grid used — this is the one
 *  screen the whole catalog exists to lead a buyer to. Each card still
 *  goes on to the unchanged connect/chat page. */
function VariantSellersView({
  categoryId,
  productId,
  variantSlug,
}: {
  categoryId: string
  productId: string
  variantSlug: string
}) {
  const { draft } = useOnboarding()
  const buyer = buyerIdentity(draft.buyer)
  const allListings = useListings()

  const listings = React.useMemo(
    () =>
      allListings.filter(
        (listing) =>
          listing.categoryId === categoryId &&
          listing.cropId === productId &&
          slugify(listing.variety) === variantSlug &&
          listing.moderationStatus !== "flagged" &&
          !listing.deletedAt
      ),
    [allListings, categoryId, productId, variantSlug]
  )

  const variantName = listings[0]?.variety ?? null

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border py-16 text-center">
        <PackageSearchIcon className="size-6 text-muted-foreground" />
        <p className="text-[15px] font-semibold">This variant isn&apos;t available anymore</p>
        <Link
          href={`/buyer/dashboard/sourcing/${categoryId}/${productId}`}
          className="text-[13px] font-medium text-amama-deep underline"
        >
          Back to {productLabel(productId)}
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link
        href={`/buyer/dashboard/sourcing/${categoryId}/${productId}`}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" />
        {productLabel(productId)}
      </Link>

      <h1 className="mt-3 text-[28px] font-bold tracking-tight">{variantName}</h1>
      <p className="mt-1 text-[14px] text-muted-foreground">
        {listings.length} {listings.length === 1 ? "seller" : "sellers"} offering this variant
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {listings.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            href={`/buyer/dashboard/sourcing/listing/${listing.id}`}
            personId={buyer.id}
          />
        ))}
      </div>
    </div>
  )
}

export { VariantSellersView }
