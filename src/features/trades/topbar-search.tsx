"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { AnchorIcon, PackageIcon, SearchIcon, StoreIcon, WaypointsIcon, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import * as W from "@/features/tradechain/demo-world"
import { productLabel } from "@/features/marketplace/catalog"
import { useListings, type Listing } from "@/features/marketplace/listing-store"
import { tradesFor, type TradePerspective } from "@/features/trades/trade-access"

type Hit = { key: string; icon: LucideIcon; title: string; meta: string; href: string }

function searchTrades(trades: W.Trade[], basePath: string, query: string): Hit[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return []
  const hits: Hit[] = []
  for (const trade of trades) {
    const product = W.productById(trade.productId)?.label ?? ""
    const variant = W.variantById(trade.variantId)?.label ?? ""
    const route = `${trade.portOfLoading} ${trade.portOfDischarge}`
    if ([trade.id, product, variant, route, trade.destination].join(" ").toLowerCase().includes(needle)) {
      hits.push({
        key: trade.id,
        icon: WaypointsIcon,
        title: `${product} · ${variant}`,
        meta: `${trade.id} · ${trade.qtyContractedMt} MT`,
        href: `${basePath}/${trade.id}`,
      })
    }
    for (const lot of W.lotsForTrade(trade.id)) {
      if (lot.id.toLowerCase().includes(needle)) {
        hits.push({ key: lot.id, icon: PackageIcon, title: lot.id, meta: `Lot · ${product} · ${trade.id}`, href: `${basePath}/${trade.id}?tab=quality` })
      }
    }
    const shipment = W.shipmentForTrade(trade.id)
    const container = W.containerForTrade(trade.id)
    const vessel = shipment ? `${shipment.vessel} ${shipment.voyage}` : container ? `${container.vessel} ${container.voyage}` : null
    if (vessel && `${vessel} ${container?.id ?? ""} ${shipment?.blNo ?? ""}`.toLowerCase().includes(needle)) {
      hits.push({ key: `${trade.id}-vessel`, icon: AnchorIcon, title: vessel, meta: `Vessel · ${product} · ${trade.id}`, href: `${basePath}/${trade.id}?tab=shipment` })
    }
  }
  return hits.slice(0, 8)
}

function searchListings(listings: Listing[], query: string, hrefFor: (listing: Listing) => string): Hit[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return []
  return listings
    .filter((listing) =>
      [productLabel(listing.cropId), listing.variety, listing.sellerName, listing.region].join(" ").toLowerCase().includes(needle)
    )
    .slice(0, 4)
    .map((listing) => ({
      key: `listing-${listing.id}`,
      icon: StoreIcon,
      title: `${productLabel(listing.cropId)} · ${listing.variety}`,
      meta: `Listing · ${listing.sellerName} · ${listing.region}`,
      href: hrefFor(listing),
    }))
}

/**
 * One search box for the whole trade book — trades by id, product or
 * port, lots by id, and vessels, containers or bills of lading — scoped to
 * what this viewer can see. ⌘K / Ctrl K focuses it from anywhere.
 */
function TopbarSearch({ perspective, email, basePath }: { perspective: TradePerspective; email: string; basePath: string }) {
  const router = useRouter()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [query, setQuery] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const [cursor, setCursor] = React.useState(0)
  const listId = React.useId()

  const pathname = usePathname()
  const allListings = useListings()
  const trades = React.useMemo(() => tradesFor(perspective, email), [perspective, email])
  const hits = React.useMemo(() => {
    const market =
      perspective === "buyer"
        ? searchListings(
            allListings.filter((listing) => listing.moderationStatus !== "flagged" && !listing.deletedAt),
            query,
            (listing) => `/buyer/dashboard/sourcing/listing/${listing.id}`
          )
        : perspective === "seller"
          ? searchListings(
              allListings.filter((listing) => listing.sellerId === email.trim().toLowerCase() && !listing.deletedAt),
              query,
              (listing) => `/seller/dashboard/listings/${listing.id}`
            )
          : []
    return [...market, ...searchTrades(trades, basePath, query)].slice(0, 8)
  }, [perspective, allListings, email, trades, basePath, query])
  const fallbackPath = perspective === "buyer" && pathname.startsWith("/buyer/dashboard/sourcing") ? "/buyer/dashboard/sourcing" : basePath

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const go = (href: string) => {
    setOpen(false)
    setQuery("")
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    router.push(href)
  }

  return (
    <div className="relative mx-auto hidden w-full max-w-md md:block">
      <SearchIcon aria-hidden className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setCursor(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault()
            setCursor((index) => Math.min(hits.length - 1, index + 1))
          } else if (event.key === "ArrowUp") {
            event.preventDefault()
            setCursor((index) => Math.max(0, index - 1))
          } else if (event.key === "Enter") {
            event.preventDefault()
            if (hits[cursor]) go(hits[cursor].href)
            else if (query.trim()) go(`${fallbackPath}?q=${encodeURIComponent(query.trim())}`)
          } else if (event.key === "Escape") {
            setOpen(false)
            inputRef.current?.blur()
          }
        }}
        role="combobox"
        aria-expanded={open && query.trim().length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={hits[cursor] ? `${listId}-${cursor}` : undefined}
        placeholder={perspective === "internal" ? "Search trades, lots, vessels…" : "Search products, orders, lots, vessels…"}
        className="h-11 w-full rounded-full border border-transparent bg-card ps-10 pe-14 text-[13px] outline-none placeholder:text-muted-foreground focus:border-input"
      />
      <kbd className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 rounded-md border border-border bg-muted px-1.5 py-0.5 font-sans text-[10.5px] text-muted-foreground">
        ⌘K
      </kbd>

      {open && query.trim() ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-border bg-popover p-1 shadow-xl"
        >
          {hits.length === 0 ? (
            <li className="px-3 py-3 text-[13px] text-muted-foreground">Nothing matches — press Enter to search all</li>
          ) : (
            hits.map((hit, index) => (
              <li
                key={hit.key}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === cursor}
                onMouseDown={(event) => {
                  event.preventDefault()
                  go(hit.href)
                }}
                onMouseEnter={() => setCursor(index)}
                className={cn("flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2", index === cursor && "bg-muted")}
              >
                <hit.icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-foreground">{hit.title}</span>
                  <span className="block truncate text-[11.5px] text-muted-foreground">{hit.meta}</span>
                </span>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  )
}

export { TopbarSearch }
