"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { CheckIcon, ChevronRightIcon, CornerDownLeftIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { CATALOG_CATEGORIES, slugify } from "@/features/marketplace/catalog"
import { useListings } from "@/features/marketplace/listing-store"
import {
  buildInterestIndex,
  namesExisting,
  pickedKeys,
  searchInterests,
  togglePick,
  type InterestNode,
  type InterestSegment,
} from "@/features/onboarding/interests"
import { cropImageUrl, crops } from "@/features/onboarding/steps"
import type { BuyerDraft } from "@/features/onboarding/types"
import { raiseTicket } from "@/features/tickets/ticket-store"

/**
 * How a buyer says what they buy:
 *
 * - A search combobox over every category, product, variety and grade,
 *   each suggestion shown as the breadcrumb that leads to it — and every
 *   step of that breadcrumb pickable on its own.
 * - Below it, category tabs (All first) over a tray of product tiles with
 *   photos, for browsing instead of typing.
 * - Something the catalog doesn't have yet can be typed and added with
 *   Enter. It joins the buyer's picks straight away, and a catalog-request
 *   ticket goes to the executives to add it properly.
 */
function InterestPicker({
  buyer,
  onChange,
  nameOf,
}: {
  buyer: BuyerDraft
  onChange: (patch: Partial<BuyerDraft> | ((previous: BuyerDraft) => Partial<BuyerDraft>)) => void
  nameOf: (productId: string) => string
}) {
  const pathname = usePathname()
  const listings = useListings()
  const [query, setQuery] = React.useState("")
  const [focused, setFocused] = React.useState(false)
  const [highlight, setHighlight] = React.useState(0)
  const [tab, setTab] = React.useState<string>("all")
  const inputRef = React.useRef<HTMLInputElement>(null)

  const index = React.useMemo(() => buildInterestIndex(listings, buyer, nameOf), [listings, buyer, nameOf])
  const byKey = React.useMemo(() => new Map(index.map((node) => [node.key, node])), [index])
  const picked = pickedKeys(buyer)
  const pickedSet = new Set(picked)
  const results = React.useMemo(() => searchInterests(index, query, 8), [index, query])
  const canAdd = query.trim().length >= 2 && !namesExisting(index, query)
  const showSuggestions = focused && query.trim().length > 0

  const toggle = (key: string) => onChange((previous) => togglePick(previous, key))

  /** Adds typed text as a new product and asks the team to add it. */
  const addNew = () => {
    const label = query.trim()
    if (label.length < 2) return
    const key = `product:${slugify(label)}`
    if (!pickedSet.has(key)) toggle(key)
    raiseTicket({
      kind: "catalog-request",
      title: `New product: ${label}`,
      description: "Typed during onboarding; not in the catalog yet.",
      tags: ["Catalog request", "Buyer"],
      metadata: { page: pathname, pageTitle: "What do you buy?", refs: {} },
      raisedBy: { id: buyer.email, name: buyer.fullName || buyer.email, kind: "buyer" },
    })
    toast.success(`${label} added — we'll add it to the catalog`)
    setQuery("")
  }

  // Product tiles and the tabs that group them.
  const products = React.useMemo(() => index.filter((node) => node.kind === "product"), [index])
  const tabs = React.useMemo(() => {
    const heads = new Map<string, string>()
    for (const node of products) heads.set(node.path[0].key, node.path[0].label)
    const order = CATALOG_CATEGORIES.map((category) => `category:${category.id}`)
    return [...heads].sort((a, b) => {
      const rank = (key: string) => (order.indexOf(key) === -1 ? 99 : order.indexOf(key))
      return rank(a[0]) - rank(b[0])
    })
  }, [products])
  const shown = tab === "all" ? products : products.filter((node) => node.path[0].key === tab)

  const photoFor = (productId: string) => {
    const crop = crops.find((entry) => entry.id === productId)
    if (crop) return cropImageUrl(crop.photo, 360)
    const listing = listings.find((entry) => entry.cropId === productId && entry.photo)
    if (!listing) return null
    return listing.photo.startsWith("photo-") ? cropImageUrl(listing.photo, 360) : listing.photo
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="relative">
        <label htmlFor="interest-search" className="sr-only">
          Search a category, product, variety or grade
        </label>
        <div className="flex h-12 items-center gap-2.5 rounded-xl border border-input bg-background px-4 transition-[border-color,box-shadow] focus-within:border-amama-deep focus-within:ring-2 focus-within:ring-amama-deep/20">
          <SearchIcon aria-hidden className="size-[18px] shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            id="interest-search"
            role="combobox"
            aria-expanded={showSuggestions}
            aria-controls="interest-suggestions"
            aria-autocomplete="list"
            autoComplete="off"
            value={query}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 120)}
            onChange={(event) => {
              setQuery(event.target.value)
              setHighlight(0)
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault()
                setHighlight((value) => Math.min(value + 1, results.length - 1))
              } else if (event.key === "ArrowUp") {
                event.preventDefault()
                setHighlight((value) => Math.max(value - 1, 0))
              } else if (event.key === "Escape") {
                setQuery("")
              } else if (event.key === "Enter") {
                event.preventDefault()
                if (results[highlight]) toggle(results[highlight].key)
                else if (canAdd) addNew()
              }
            }}
            placeholder="Search cashew, W-240, spices, Kashmiri apple…"
            className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted-foreground"
          />
          {query ? (
            <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-card">
              <XIcon className="size-4" />
            </button>
          ) : null}
        </div>

        {showSuggestions ? (
          <div
            id="interest-suggestions"
            role="listbox"
            className="absolute inset-x-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-2xl bg-popover ring-1 ring-black/10"
          >
            {results.map((node, position) => (
              <SuggestionRow
                key={node.key}
                node={node}
                query={query}
                highlighted={position === highlight}
                picked={pickedSet}
                onToggle={toggle}
              />
            ))}
            {canAdd ? (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={addNew}
                className={cn("flex w-full items-center gap-2.5 px-4 py-3 text-start text-[14px] hover:bg-card", results.length > 0 && "border-t border-border")}
              >
                <PlusIcon aria-hidden className="size-4 text-amama-deep" />
                <span className="min-w-0 flex-1">
                  Add <span className="font-semibold">“{query.trim()}”</span>
                  <span className="block text-[12.5px] text-muted-foreground">Not in the catalog yet — we&apos;ll add it</span>
                </span>
                {results.length === 0 ? <CornerDownLeftIcon aria-hidden className="size-4 text-muted-foreground" /> : null}
              </button>
            ) : null}
            {results.length === 0 && !canAdd ? <p className="px-4 py-3 text-[13.5px] text-muted-foreground">Already picked.</p> : null}
          </div>
        ) : null}
      </div>

      {picked.length > 0 ? (
        <ul aria-label="Your picks" className="-mt-1 flex flex-wrap gap-1.5">
          {picked.map((key) => {
            const node = byKey.get(key)
            const label = (node ? node.path.slice(-2).map((step) => step.label) : [key.split(":").slice(1).join(":")]).join(" › ") + (node?.note ? ` · ${node.note}` : "")
            return (
              <li key={key}>
                <span className="inline-flex h-8 items-center gap-0.5 rounded-full bg-amama ps-3 pe-1 text-[13px] font-medium text-white">
                  {label}
                  <button type="button" aria-label={`Remove ${label}`} onClick={() => toggle(key)} className="grid size-6 place-items-center rounded-full text-sun hover:bg-white/15">
                    <XIcon aria-hidden className="size-3.5" />
                  </button>
                </span>
              </li>
            )
          })}
        </ul>
      ) : null}

      <div>
        <div role="tablist" aria-label="Categories" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-none">
          {[["all", "All"] as const, ...tabs].map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cn(
                "h-9 shrink-0 rounded-full px-4 text-[14px] font-medium transition-colors",
                tab === key ? "bg-graphite text-white" : "bg-card text-foreground hover:bg-muted"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-3 rounded-[24px] bg-card p-3">
          <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {shown.map((node) => {
              const on = pickedSet.has(node.key)
              const photo = photoFor(node.key.slice("product:".length))
              const category = CATALOG_CATEGORIES.find((entry) => `category:${entry.id}` === node.path[0].key)
              const Icon = category?.icon
              return (
                <li key={node.key}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(node.key)}
                    className={cn(
                      "group/tile relative flex w-full flex-col overflow-hidden rounded-[18px] bg-background text-start transition-[box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-amama-deep/40",
                      on && "ring-2 ring-amama-deep"
                    )}
                  >
                    <span className="relative block aspect-[4/3] w-full overflow-hidden bg-muted">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover/tile:scale-[1.04]" />
                      ) : (
                        <span className="grid size-full place-items-center bg-gradient-to-br from-amama-subtle to-muted text-amama-deep">
                          {Icon ? <Icon aria-hidden className="size-8" strokeWidth={1.6} /> : null}
                        </span>
                      )}
                      {on ? (
                        <span className="absolute end-2 top-2 grid size-6 place-items-center rounded-full bg-amama text-sun">
                          <CheckIcon className="size-3.5" strokeWidth={3} />
                        </span>
                      ) : null}
                    </span>
                    <span className="truncate px-3 py-2.5 text-[14px] font-medium">{node.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}

/** A suggestion as its breadcrumb — each step pickable on its own. */
function SuggestionRow({
  node,
  query,
  highlighted,
  picked,
  onToggle,
}: {
  node: InterestNode
  query: string
  highlighted: boolean
  picked: Set<string>
  onToggle: (key: string) => void
}) {
  const on = picked.has(node.key)
  return (
    <div role="option" aria-selected={highlighted} className={cn("flex items-center gap-2 px-2 py-1.5", highlighted && "bg-card")}>
      <span className="flex min-w-0 flex-1 flex-wrap items-center">
        {node.path.map((step, position) => (
          <React.Fragment key={step.key}>
            {position > 0 ? <ChevronRightIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground/60" /> : null}
            <Segment step={step} query={query} last={position === node.path.length - 1} picked={picked.has(step.key)} onToggle={onToggle} />
          </React.Fragment>
        ))}
        {node.note ? <span className="ms-1.5 text-[12.5px] text-muted-foreground">{node.note}</span> : null}
      </span>
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onToggle(node.key)}
        aria-label={on ? `Remove ${node.label}` : `Add ${node.label}`}
        aria-pressed={on}
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full transition-colors",
          on ? "bg-amama text-sun" : "border border-input text-muted-foreground hover:text-foreground"
        )}
      >
        {on ? <CheckIcon className="size-4" strokeWidth={2.5} /> : <PlusIcon className="size-4" />}
      </button>
    </div>
  )
}

function Segment({ step, query, last, picked, onToggle }: { step: InterestSegment; query: string; last: boolean; picked: boolean; onToggle: (key: string) => void }) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const pattern = words.length ? new RegExp(`(${words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi") : null
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onToggle(step.key)}
      aria-pressed={picked}
      className={cn(
        "rounded-full px-2.5 py-1 text-[14px] transition-colors",
        picked ? "bg-amama-subtle font-semibold text-amama-deep" : last ? "font-medium text-foreground hover:bg-muted" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {pattern
        ? step.label.split(pattern).map((part, position) =>
            words.includes(part.toLowerCase()) ? (
              <mark key={position} className="bg-transparent font-semibold text-inherit">
                {part}
              </mark>
            ) : (
              part
            )
          )
        : step.label}
    </button>
  )
}

export { InterestPicker }
