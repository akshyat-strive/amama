"use client"

import * as React from "react"
import { CheckIcon, ChevronRightIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react"

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
import type { BuyerDraft } from "@/features/onboarding/types"

/**
 * One search box for everything a buyer might want — a whole category, a
 * product, a seller's variety, or a single grade. Each result is the
 * breadcrumb that leads to it, and every step of that breadcrumb is
 * itself pickable: typing "w-240" offers `Nuts & Oilseeds › Cashew ›
 * W-240`, and the buyer can take just the grade, all cashew, or the whole
 * category from the same row. Anything not found can be added as new.
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
  const listings = useListings()
  const [query, setQuery] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  const index = React.useMemo(() => buildInterestIndex(listings, buyer, nameOf), [listings, buyer, nameOf])
  const byKey = React.useMemo(() => new Map(index.map((node) => [node.key, node])), [index])
  const picked = pickedKeys(buyer)
  const pickedSet = new Set(picked)
  const results = React.useMemo(() => searchInterests(index, query), [index, query])
  const canAdd = query.trim().length >= 2 && !namesExisting(index, query)

  const toggle = (key: string) => onChange((previous) => togglePick(previous, key))

  const add = (kind: "product" | "category" | "grade") => {
    const label = query.trim()
    const key = kind === "grade" ? `grade:${label}` : `${kind}:${slugify(label)}`
    if (!pickedSet.has(key)) toggle(key)
    setQuery("")
    inputRef.current?.focus()
  }

  return (
    <div>
      <div className="relative">
        <label htmlFor="interest-search" className="sr-only">
          Search a category, product, variety or grade
        </label>
        <SearchIcon aria-hidden className="pointer-events-none absolute start-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          id="interest-search"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return
            event.preventDefault()
            if (results[0]) toggle(results[0].key)
            else if (canAdd) add("product")
          }}
          placeholder="Cashew, W-240, spices, Kashmiri apple…"
          className="h-12 w-full rounded-2xl border border-border bg-card ps-11 pe-11 text-[15px] outline-none transition-colors placeholder:text-muted-foreground focus:border-amama-deep [&::-webkit-search-cancel-button]:hidden"
        />
        {query ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("")
              inputRef.current?.focus()
            }}
            className="absolute end-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <XIcon className="size-4" />
          </button>
        ) : null}
      </div>

      <p aria-live="polite" className="sr-only">
        {query ? `${results.length} matches` : ""} {picked.length} picked
      </p>

      {picked.length > 0 ? (
        <ul aria-label="Your picks" className="mt-3 flex flex-wrap gap-1.5">
          {picked.map((key) => {
            const node = byKey.get(key)
            const trail = node ? node.path.slice(-2).map((step) => step.label) : [key.split(":").slice(1).join(":")]
            const label = trail.join(" › ") + (node?.note ? ` · ${node.note}` : "")
            return (
              <li key={key}>
                <span className="inline-flex h-8 items-center gap-0.5 rounded-full border border-amama-deep bg-amama-subtle ps-3 pe-1 text-[13px] font-medium text-amama-deep">
                  {label}
                  <button
                    type="button"
                    aria-label={`Remove ${label}`}
                    onClick={() => toggle(key)}
                    className="grid size-6 place-items-center rounded-full hover:bg-amama-deep/10"
                  >
                    <XIcon aria-hidden className="size-3.5" />
                  </button>
                </span>
              </li>
            )
          })}
        </ul>
      ) : null}

      {query ? (
        <ul aria-label="Matches" className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {results.map((node) => (
            <ResultRow key={node.key} node={node} query={query} picked={pickedSet} onToggle={toggle} />
          ))}
          {canAdd ? (
            <li className="flex flex-wrap items-center gap-x-2 gap-y-1.5 bg-muted/40 px-3 py-2.5 text-[13.5px]">
              <span className="text-muted-foreground">
                Add <span className="font-semibold text-foreground">“{query.trim()}”</span> as
              </span>
              {(["product", "category", "grade"] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => add(kind)}
                  className="inline-flex h-8 items-center gap-1 rounded-full border border-border bg-card px-3 font-medium hover:bg-muted"
                >
                  <PlusIcon aria-hidden className="size-3.5 text-muted-foreground" />a {kind}
                </button>
              ))}
            </li>
          ) : null}
          {results.length === 0 && !canAdd ? <li className="px-4 py-3 text-[13.5px] text-muted-foreground">Already picked.</li> : null}
        </ul>
      ) : (
        <BrowseList index={index} picked={pickedSet} onToggle={toggle} />
      )}
    </div>
  )
}

/** One match: its breadcrumb, each step a pick of its own, and a toggle
 *  for the match itself at the end. */
function ResultRow({
  node,
  query,
  picked,
  onToggle,
}: {
  node: InterestNode
  query: string
  picked: Set<string>
  onToggle: (key: string) => void
}) {
  const on = picked.has(node.key)
  return (
    <li className="flex items-center gap-2 py-1.5 ps-1.5 pe-2">
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-y-0.5">
        {node.path.map((step, position) => (
          <React.Fragment key={step.key}>
            {position > 0 ? <ChevronRightIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground/60" /> : null}
            <SegmentButton step={step} query={query} last={position === node.path.length - 1} picked={picked.has(step.key)} onToggle={onToggle} />
          </React.Fragment>
        ))}
        {node.note ? <span className="ms-1.5 text-[12.5px] text-muted-foreground">{node.note}</span> : null}
      </span>
      <button
        type="button"
        aria-label={on ? `Remove ${node.label}` : `Add ${node.label}`}
        aria-pressed={on}
        onClick={() => onToggle(node.key)}
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full border transition-colors",
          on ? "border-amama-deep bg-amama-deep text-white" : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        {on ? <CheckIcon className="size-4" strokeWidth={2.5} /> : <PlusIcon className="size-4" />}
      </button>
    </li>
  )
}

function SegmentButton({
  step,
  query,
  last,
  picked,
  onToggle,
}: {
  step: InterestSegment
  query?: string
  last: boolean
  picked: boolean
  onToggle: (key: string) => void
}) {
  return (
    <button
      type="button"
      aria-pressed={picked}
      onClick={() => onToggle(step.key)}
      className={cn(
        "rounded-full px-2.5 py-1 text-[13.5px] transition-colors",
        picked
          ? "bg-amama-subtle font-semibold text-amama-deep"
          : last
            ? "font-medium text-foreground hover:bg-muted"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Highlight text={step.label} query={query} />
    </button>
  )
}

/** Bolds each typed word where it appears in a label. */
function Highlight({ text, query }: { text: string; query?: string }) {
  const words = (query ?? "").trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return <>{text}</>
  const pattern = new RegExp(`(${words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi")
  return (
    <>
      {text.split(pattern).map((part, position) =>
        words.includes(part.toLowerCase()) ? (
          <mark key={position} className="bg-transparent font-semibold text-inherit underline decoration-amama-deep/40 underline-offset-2">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}

/** Before anything is typed: each category with its products, so the
 *  common picks are one tap away and the search box is for the rest. */
function BrowseList({ index, picked, onToggle }: { index: InterestNode[]; picked: Set<string>; onToggle: (key: string) => void }) {
  const rows = React.useMemo(() => {
    const products = index.filter((node) => node.kind === "product")
    const order = CATALOG_CATEGORIES.map((category) => `category:${category.id}`)
    const groups = new Map<string, { head: InterestSegment; products: InterestSegment[] }>()
    for (const node of products) {
      const head = node.path[0]
      const group = groups.get(head.key) ?? { head, products: [] }
      if (node.path.length > 1) group.products.push(node)
      groups.set(head.key, group)
    }
    const rank = (key: string) => {
      const position = order.indexOf(key)
      return position === -1 ? order.length - 1 : position
    }
    return [...groups.values()].sort((a, b) => rank(a.head.key) - rank(b.head.key))
  }, [index])

  return (
    <ul aria-label="Browse" className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
      {rows.map((row) => (
        <li key={row.head.key} className="flex flex-wrap items-center gap-y-0.5 py-1.5 ps-1.5 pe-2">
          <SegmentButton step={row.head} last={row.products.length === 0} picked={picked.has(row.head.key)} onToggle={onToggle} />
          {row.products.length > 0 ? <ChevronRightIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground/60" /> : null}
          {row.products.map((product) => (
            <SegmentButton key={product.key} step={product} last picked={picked.has(product.key)} onToggle={onToggle} />
          ))}
        </li>
      ))}
    </ul>
  )
}

export { InterestPicker }
