"use client"

import * as React from "react"
import { PackageSearchIcon } from "lucide-react"

import { catalogCategory, productLabel, gradeSlug } from "@/features/marketplace/catalog"
import { CropImage } from "@/features/marketplace/crop-image"
import { formatInr } from "@/features/marketplace/currency"
import { useListings } from "@/features/marketplace/listing-store"
import { GradeCard, MarketplaceBreadcrumbs } from "@/features/marketplace/marketplace-ui"
import { gradesFor } from "@/features/onboarding/steps"

/**
 * Level 3 of the drill-down: the grades one product is offered at
 * ("Cashew" → W-180, W-240, W-320), each as a spec card — the grade as a
 * seal, price range, volume, sellers, origins — rather than another photo
 * grid, so it reads as "these are grades" at a glance.
 */
function ProductVariantsView({ categoryId, productId }: { categoryId: string; productId: string }) {
  const category = catalogCategory(categoryId)
  const allListings = useListings()
  const listings = React.useMemo(
    () =>
      allListings.filter(
        (listing) => listing.categoryId === categoryId && listing.cropId === productId && listing.moderationStatus !== "flagged" && !listing.deletedAt
      ),
    [allListings, categoryId, productId]
  )

  const grades = React.useMemo(() => {
    const byGrade = new Map<string, typeof listings>()
    for (const listing of listings) {
      const key = gradeSlug(listing.grade)
      byGrade.set(key, [...(byGrade.get(key) ?? []), listing])
    }
    // Most-offered first, then the trade's own grade order.
    const order = gradesFor(productId)
    return [...byGrade.entries()]
      .map(([slug, group]) => ({ slug, label: group[0].grade || "Ungraded", listings: group }))
      .sort((a, b) => b.listings.length - a.listings.length || order.indexOf(a.label) - order.indexOf(b.label))
  }, [listings, productId])

  const name = productLabel(productId)
  const minPrice = listings.length ? Math.min(...listings.map((listing) => listing.pricePerTonneUsd)) : 0

  return (
    <div>
      <MarketplaceBreadcrumbs
        trail={[
          { label: "Marketplace", href: "/buyer/dashboard/sourcing" },
          { label: category.label, href: `/buyer/dashboard/sourcing/${categoryId}` },
          { label: name },
        ]}
      />

      <header className="mt-5 flex items-center gap-5">
        {listings[0]?.photo ? (
          <div className="relative size-20 shrink-0 overflow-hidden rounded-[22px] sm:size-24">
            <CropImage photo={listings[0].photo} alt={name} sizes="96px" />
          </div>
        ) : null}
        <div className="min-w-0">
          <h1 className="text-[34px] font-semibold tracking-[-0.03em] sm:text-[40px]">{name}</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">
            {grades.length} {grades.length === 1 ? "grade" : "grades"} · {new Set(listings.map((listing) => listing.sellerId)).size} sellers
            {listings.length ? ` · from ${formatInr(minPrice)}/t` : ""}
          </p>
        </div>
      </header>

      {grades.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-[28px] bg-card py-16 text-center">
          <PackageSearchIcon className="size-6 text-muted-foreground" />
          <p className="text-[15px] font-semibold">No sellers here yet</p>
          <p className="max-w-xs text-[13px] leading-relaxed text-muted-foreground">Nobody has listed {name} yet.</p>
        </div>
      ) : (
        <>
          <h2 className="mt-10 text-[21px] font-semibold tracking-[-0.02em]">Pick a grade</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {grades.map((grade, index) => (
              <GradeCard key={grade.slug} href={`/buyer/dashboard/sourcing/${categoryId}/${productId}/${grade.slug}`} grade={grade.label} listings={grade.listings} rank={index} total={grades.length} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export { ProductVariantsView }
