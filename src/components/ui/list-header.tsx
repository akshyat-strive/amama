"use client"

import * as React from "react"
import { SearchIcon, SlidersHorizontalIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet"

const ICON_BUTTON = "relative grid size-10 shrink-0 place-items-center rounded-xl bg-card text-foreground transition-colors hover:bg-muted"

/**
 * A list page's heading, for `ColumnCard`'s `heading` slot: the page's
 * name, then a search icon and a filter icon. Search opens in place of
 * the name and stays open while it holds a query; everything else the
 * list can be switched or narrowed by lives in the filter sheet.
 */
function ListHeading({
  title,
  query,
  onQueryChange,
  placeholder = "Search",
  filterCount,
  onFilters,
}: {
  title: string
  query: string
  onQueryChange: (query: string) => void
  placeholder?: string
  /** How many filters are off their default; a dot shows when any are. */
  filterCount?: number
  /** Leave out when the list has nothing to filter. */
  onFilters?: () => void
}) {
  const [searching, setSearching] = React.useState(false)
  const open = searching || query.length > 0
  const input = React.useRef<HTMLInputElement>(null)

  const close = () => {
    onQueryChange("")
    setSearching(false)
  }

  return (
    <div className="flex h-10 items-center gap-2">
      {open ? (
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl bg-card px-3 text-muted-foreground focus-within:ring-2 focus-within:ring-ring/30 sm:max-w-md">
          <SearchIcon aria-hidden className="size-4 shrink-0" />
          <input
            ref={input}
            autoFocus
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") close()
            }}
            placeholder={placeholder}
            aria-label={`Search ${title.toLowerCase()}`}
            className="min-w-0 flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
          />
          <button type="button" onClick={close} aria-label="Close search" className="grid size-6 shrink-0 place-items-center rounded-full hover:bg-muted">
            <XIcon className="size-3.5" />
          </button>
        </label>
      ) : (
        <>
          <span aria-hidden className="min-w-0 flex-1 truncate text-[28px] leading-none font-semibold tracking-[-0.025em] text-foreground">
            {title}
          </span>
          <button type="button" onClick={() => setSearching(true)} aria-label={`Search ${title.toLowerCase()}`} className={ICON_BUTTON}>
            <SearchIcon aria-hidden className="size-[18px]" />
          </button>
        </>
      )}
      {open ? <span className="flex-1 max-sm:hidden" /> : null}
      {onFilters ? <FiltersButton count={filterCount ?? 0} onClick={onFilters} /> : null}
    </div>
  )
}

function FiltersButton({ count, onClick, className }: { count: number; onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={count ? `Filters, ${count} on` : "Filters"} className={cn(ICON_BUTTON, className)}>
      <SlidersHorizontalIcon aria-hidden className="size-[18px]" />
      {count ? <span aria-hidden className="absolute end-2 top-2 size-2 rounded-full bg-amama-deep ring-2 ring-card" /> : null}
    </button>
  )
}

/** The filter sheet: a bottom sheet on phones, a side sheet on wide
 *  screens. `footer` is the closing action — "Show 12 tickets". */
function FilterSheet({
  open,
  onOpenChange,
  title = "Filters",
  footer,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  footer?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="responsive" className="overflow-y-auto sm:max-w-sm">
        <div className="flex flex-col gap-6 pb-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-semibold tracking-[-0.02em]">{title}</h2>
            <SheetClose aria-label={`Close ${title.toLowerCase()}`} className="grid size-9 place-items-center rounded-full bg-card text-foreground/75 transition-colors hover:bg-muted">
              <XIcon aria-hidden className="size-4" />
            </SheetClose>
          </div>
          {children}
          {footer ? <div className="flex gap-2">{footer}</div> : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}

/** One choice in the filter sheet: full-width segments, graphite when
 *  picked. Wraps to rows of two when there are more than three. */
function SheetChoice<T extends string>({
  legend,
  value,
  onChange,
  options,
}: {
  legend: string
  value: T
  onChange: (value: T) => void
  options: readonly { value: T; label: string }[]
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-[13px] font-medium text-muted-foreground">{legend}</legend>
      <div className={cn("gap-2", options.length > 3 ? "grid grid-cols-2" : "flex")}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-11 min-w-0 flex-1 truncate rounded-2xl px-3 text-[14.5px] font-medium transition-colors",
              value === option.value ? "bg-graphite text-white" : "bg-card text-foreground hover:bg-muted"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

/** A yes/no row in the filter sheet. */
function SheetToggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-4 rounded-2xl bg-card px-4 py-3 text-start"
    >
      <span>
        <span className="block text-[15px] font-medium">{label}</span>
        {hint ? <span className="block text-[12.5px] text-muted-foreground">{hint}</span> : null}
      </span>
      <span aria-hidden className={cn("relative h-6 w-10 shrink-0 rounded-full transition-colors", checked ? "bg-amama-deep" : "bg-foreground/15")}>
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white transition-[inset-inline-start]", checked ? "start-[18px]" : "start-0.5")} />
      </span>
    </button>
  )
}

/** Wraps the first thing inside a `ColumnCard`'s scroll area — status
 *  pills, usually — so it sits just under the header's divider and stays
 *  put while the rows scroll beneath. `trailing` sits at its end. */
function StickyBar({ children, trailing }: { children: React.ReactNode; trailing?: React.ReactNode }) {
  return (
    <div className="sticky -top-1.5 z-20 -mx-1.5 -mt-1.5 bg-background px-3 pt-2">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">{children}</div>
        {trailing ? <div className="shrink-0">{trailing}</div> : null}
      </div>
      <div aria-hidden className="mt-2 h-px bg-border" />
    </div>
  )
}

export { FilterSheet, FiltersButton, ListHeading, SheetChoice, SheetToggle, StickyBar }
