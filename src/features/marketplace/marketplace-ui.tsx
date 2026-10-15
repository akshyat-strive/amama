"use client"

import * as React from "react"
import Link from "next/link"
import { BadgeCheckIcon, ChevronLeftIcon, ChevronRightIcon, MapPinIcon, PackageIcon, UsersIcon } from "lucide-react"

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

/** Categories as compact pills. Long lists scroll sideways, and a fade
 *  with an arrow appears on whichever side has more — only when there is
 *  more. */
function CategoryTabs({
  items,
  selectedId,
  onSelect,
}: {
  items: { id: string; label: string; count: number }[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  const track = React.useRef<HTMLDivElement>(null)
  const [edge, setEdge] = React.useState({ start: false, end: false })

  const measure = React.useCallback(() => {
    const el = track.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    const left = Math.abs(el.scrollLeft)
    setEdge({ start: left > 2, end: left < max - 2 })
  }, [])

  // The observer reports the size on its first call too, so no separate
  // initial measure is needed.
  React.useEffect(() => {
    const el = track.current
    if (!el) return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [measure, items.length])

  const slide = (direction: 1 | -1) => {
    const el = track.current
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.7, behavior: "smooth" })
  }

  const arrow = "absolute top-1/2 z-10 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-card text-foreground/80 transition-colors hover:bg-muted"

  return (
    <div className="relative">
      <div ref={track} role="tablist" aria-label="Categories" onScroll={measure} className="flex gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
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
                "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors",
                on ? "bg-graphite text-white" : "bg-card text-foreground hover:bg-muted"
              )}
            >
              {item.label}
              <span className={cn("text-[11.5px] tabular-nums", on ? "text-white/60" : "text-muted-foreground")}>{item.count}</span>
            </button>
          )
        })}
      </div>
      {edge.start ? (
        <>
          <div aria-hidden className="pointer-events-none absolute inset-y-0 start-0 z-[5] w-14 bg-gradient-to-r from-background via-background/80 to-transparent rtl:bg-gradient-to-l" />
          <button type="button" aria-label="Scroll categories back" onClick={() => slide(-1)} className={cn(arrow, "start-0")}>
            <ChevronLeftIcon aria-hidden className="size-4 rtl:-scale-x-100" />
          </button>
        </>
      ) : null}
      {edge.end ? (
        <>
          <div aria-hidden className="pointer-events-none absolute inset-y-0 end-0 z-[5] w-14 bg-gradient-to-l from-background via-background/80 to-transparent rtl:bg-gradient-to-r" />
          <button type="button" aria-label="Scroll categories forward" onClick={() => slide(1)} className={cn(arrow, "end-0")}>
            <ChevronRightIcon aria-hidden className="size-4 rtl:-scale-x-100" />
          </button>
        </>
      ) : null}
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

/** A seller's offer at one grade — a person, not a product tile. The name
 *  and place on top; underneath, the offer's values separated by dots, with
 *  the price on the same line. On a wide screen it all sits on one row. The
 *  hairline under it starts at the row's edge, so it runs under the avatar. */
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
        className="chat-row group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-2xl px-3 py-3.5 outline-none transition-colors [--row-inset:0.75rem] hover:bg-card focus-visible:bg-card sm:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] sm:gap-x-6"
      >
        <span aria-hidden className="grid size-9 place-items-center rounded-full bg-graphite text-[13px] font-semibold text-white">
          {initials}
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-semibold tracking-[-0.016em]">{listing.sellerName}</span>
            {listing.moderationStatus === "verified" ? <BadgeCheckIcon aria-label="Verified listing" className="size-4 shrink-0 text-amama-deep" /> : null}
          </span>
          <span className="block truncate text-[12.5px] text-muted-foreground">
            {country ? `${countryCodeToFlag(country.code)} ` : ""}
            {listing.region}
            {country ? `, ${country.name}` : ""}
          </span>
        </span>
        <ChevronRightIcon aria-hidden className="size-4 shrink-0 text-muted-foreground/60 sm:hidden rtl:-scale-x-100" />

        {/* Second line on a phone; on a wide row these two sit in the row. */}
        <span className="col-span-3 flex items-baseline justify-between gap-3 sm:contents">
          <span className="min-w-0 truncate text-[13px] text-muted-foreground sm:text-start">
            <span className="text-foreground">{listing.variety}</span>
            <span aria-hidden className="mx-1.5">·</span>
            <span className="tabular-nums">{listing.quantityMt} MT</span>
          </span>
          <span className="shrink-0 whitespace-nowrap sm:text-end">
            <span className="text-[16px] font-semibold tracking-[-0.02em] tabular-nums">{formatInr(listing.pricePerTonneUsd)}</span>
            <span className="text-[12px] text-muted-foreground"> /t</span>
          </span>
        </span>
        <span className="hidden h-9 items-center rounded-full border border-foreground/15 px-4 text-[14px] font-medium text-foreground transition-colors group-hover:bg-graphite group-hover:text-white sm:inline-flex">
          View offer
        </span>
      </Link>
    </li>
  )
}

export { MarketplaceBreadcrumbs, CategoryTabs, GradeCard, SellerRow }
