"use client"

import * as React from "react"
import Link from "next/link"
import { BadgeCheckIcon, ChevronRightIcon, MapPinIcon, PackageIcon, UsersIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { formatInr } from "@/features/marketplace/currency"
import type { Listing } from "@/features/marketplace/listing-store"
import { countries, countryCodeToFlag } from "@/features/onboarding/countries"

/** Marketplace › Fruits › Apple › Extra Fancy — every level of the
 *  drill-down, each one a way back. */
function MarketplaceBreadcrumbs({ trail }: { trail: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-[14px]">
        {trail.map((step, index) => (
          <li key={`${step.label}-${index}`} className="flex items-center gap-1">
            {index > 0 ? <ChevronRightIcon aria-hidden className="size-3.5 text-muted-foreground/70" /> : null}
            {step.href ? (
              <Link href={step.href} className="text-muted-foreground transition-colors hover:text-amama-deep">
                {step.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-medium text-foreground">
                {step.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

/** Categories as words, not photos — it stays readable however many
 *  categories there are, and scrolls sideways on a phone. */
function CategoryTabs({
  items,
  selectedId,
  onSelect,
}: {
  items: { id: string; label: string; count: number }[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <div role="tablist" aria-label="Categories" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 py-1 scrollbar-none">
      {items.map((item) => {
        const on = item.id === selectedId
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onSelect(item.id)}
            className={cn(
              "inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[14.5px] font-medium transition-colors",
              on ? "bg-graphite text-white" : "bg-card text-foreground hover:bg-muted"
            )}
          >
            {item.label}
            <span className={cn("text-[12.5px] tabular-nums", on ? "text-white/60" : "text-muted-foreground")}>{item.count}</span>
          </button>
        )
      })}
    </div>
  )
}

const flags = (listings: Listing[]) => [...new Set(listings.map((listing) => listing.country))]

/**
 * A grade, looked at as a spec rather than a picture: the grade itself as
 * a seal, then what's on offer at it — price range, volume, how many
 * sellers, and where from.
 */
function GradeCard({ href, grade, listings, rank, total }: { href: string; grade: string; listings: Listing[]; rank: number; total: number }) {
  const prices = listings.map((listing) => listing.pricePerTonneUsd)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const volume = listings.reduce((sum, listing) => sum + listing.quantityMt, 0)
  const sellers = new Set(listings.map((listing) => listing.sellerId)).size
  const origins = flags(listings)

  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-[22px] bg-card p-4 outline-none transition-colors hover:bg-[#ededf1] focus-visible:ring-2 focus-visible:ring-amama-deep/40 sm:gap-5 sm:rounded-[28px] sm:p-6 dark:hover:bg-muted"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex min-h-10 items-center rounded-xl bg-amama px-3.5 text-[18px] font-semibold tracking-[-0.02em] text-white sm:min-h-12 sm:rounded-2xl sm:px-4 sm:text-[20px]">
          {grade}
        </span>
        {rank === 0 && total > 1 ? (
          <span className="rounded-full bg-graphite px-2.5 py-1 text-[12px] font-medium text-white">Most offered</span>
        ) : null}
      </div>
      <div>
        <p className="text-[20px] font-semibold tracking-[-0.022em] tabular-nums sm:text-[24px]">
          {formatInr(min)}
          {max > min ? <span className="text-muted-foreground"> – {formatInr(max)}</span> : null}
          <span className="text-[14px] font-normal text-muted-foreground"> /t</span>
        </p>
      </div>
      <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-muted-foreground tabular-nums sm:hidden">
        <span className="font-medium text-foreground">{volume} MT</span>
        <span aria-hidden>·</span>
        <span>
          {sellers} {sellers === 1 ? "seller" : "sellers"}
        </span>
        <span aria-hidden>·</span>
        <span>{origins.map(countryCodeToFlag).join(" ")}</span>
        <ChevronRightIcon aria-hidden className="ms-auto size-4" />
      </p>
      <dl className="hidden grid-cols-3 gap-3 border-t border-border pt-4 text-[13px] sm:grid">
        <div>
          <dt className="flex items-center gap-1 text-muted-foreground">
            <PackageIcon aria-hidden className="size-3.5" /> Volume
          </dt>
          <dd className="mt-0.5 font-semibold tabular-nums">{volume} MT</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-muted-foreground">
            <UsersIcon aria-hidden className="size-3.5" /> Sellers
          </dt>
          <dd className="mt-0.5 font-semibold tabular-nums">{sellers}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-muted-foreground">
            <MapPinIcon aria-hidden className="size-3.5" /> From
          </dt>
          <dd className="mt-0.5 truncate text-[15px]" title={origins.map((code) => countries.find((entry) => entry.code === code)?.name ?? code).join(", ")}>
            {origins.map(countryCodeToFlag).join(" ")}
          </dd>
        </div>
      </dl>
      <span className="hidden items-center gap-1 text-[14px] font-medium text-amama-deep sm:inline-flex">
        See sellers
        <ChevronRightIcon aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}

/** A seller's offer at one grade — a person, not a product tile: who,
 *  where, how much, at what price. One row of a list, an inset hairline
 *  under it from the name onwards. */
function SellerRow({ listing, href }: { listing: Listing; href: string }) {
  const country = countries.find((entry) => entry.code === listing.country)
  const initials = listing.sellerName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("")
  return (
    <li>
      <Link
        href={href}
        className="chat-row group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-2xl px-2 py-3 outline-none transition-colors [--row-inset:3.75rem] hover:bg-card focus-visible:bg-card sm:gap-x-4 sm:gap-y-2 sm:px-3 sm:py-3.5 sm:grid-cols-[auto_minmax(0,1.4fr)_minmax(0,1fr)_auto_auto] sm:[--row-inset:4.75rem]"
      >
        <span aria-hidden className="grid size-10 place-items-center rounded-full bg-graphite text-[14px] font-semibold text-white sm:size-12 sm:text-[15px]">
          {initials}
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-semibold tracking-[-0.016em] sm:text-[16px]">{listing.sellerName}</span>
            {listing.moderationStatus === "verified" ? <BadgeCheckIcon aria-label="Verified listing" className="size-4 shrink-0 text-amama-deep" /> : null}
          </span>
          <span className="block truncate text-[13px] text-muted-foreground">
            {country ? `${countryCodeToFlag(country.code)} ` : ""}
            {listing.region}
            {country ? `, ${country.name}` : ""}
          </span>
        </span>
        <span className="col-span-2 col-start-2 row-start-2 flex gap-4 text-[12.5px] sm:col-span-1 sm:col-start-auto sm:text-[13px]">
          <span>
            <span className="block text-muted-foreground">Variety</span>
            <span className="font-medium">{listing.variety}</span>
          </span>
          <span>
            <span className="block text-muted-foreground">Available</span>
            <span className="font-medium tabular-nums">{listing.quantityMt} MT</span>
          </span>
        </span>
        <span className="col-start-3 row-start-1 text-end sm:col-start-auto sm:row-start-auto sm:text-start">
          <span className="block text-[16px] font-semibold tracking-[-0.02em] tabular-nums sm:text-[18px]">{formatInr(listing.pricePerTonneUsd)}</span>
          <span className="block text-[12px] text-muted-foreground">per tonne</span>
        </span>
        <span className="hidden h-9 items-center rounded-full border border-foreground/15 px-4 text-[14px] font-medium text-foreground transition-colors group-hover:bg-graphite group-hover:text-white sm:inline-flex">
          View offer
        </span>
      </Link>
    </li>
  )
}

export { MarketplaceBreadcrumbs, CategoryTabs, GradeCard, SellerRow }
