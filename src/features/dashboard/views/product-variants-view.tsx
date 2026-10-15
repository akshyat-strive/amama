"use client"

import * as React from "react"
import { PackageSearchIcon } from "lucide-react"

import { DetailColumnCard } from "@/components/ui/column-card"
import { catalogCategory, productLabel, gradeSlug } from "@/features/marketplace/catalog"
import { formatInr } from "@/features/marketplace/currency"
import { useListings } from "@/features/marketplace/listing-store"
import { GradeCard } from "@/features/marketplace/marketplace-ui"
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
    <DetailColumnCard
      backHref={`/buyer/dashboard/sourcing/${categoryId}`}
      backLabel={category.label}
      crumbs={[
        { label: "Marketplace", href: "/buyer/dashboard/sourcing" },
        { label: category.label, href: `/buyer/dashboard/sourcing/${categoryId}` },
      ]}
      title={name}
      meta={`${grades.length} ${grades.length === 1 ? "grade" : "grades"} · ${new Set(listings.map((listing) => listing.sellerId)).size} sellers${listings.length ? ` · from ${formatInr(minPrice)}/t` : ""}`}
    >
      {grades.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[20px] bg-card py-16 text-center">
          <PackageSearchIcon className="size-6 text-muted-foreground" />
          <p className="text-[15px] font-semibold">No sellers here yet</p>
          <p className="max-w-xs text-[13px] leading-relaxed text-muted-foreground">Nobody has listed {name} yet.</p>
        </div>
      ) : (
        <>
          <h2 className="px-1 text-[15px] font-semibold tracking-[-0.01em]">Pick a grade</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
            {grades.map((grade, index) => (
              <GradeCard key={grade.slug} href={`/buyer/dashboard/sourcing/${categoryId}/${productId}/${grade.slug}`} grade={grade.label} listings={grade.listings} rank={index} total={grades.length} />
            ))}
          </div>
        </>
      )}
    </DetailColumnCard>
  )
}

export { ProductVariantsView }
