"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BellIcon, SearchIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { usePeek } from "@/features/internal/peek-context"
import { Eyebrow, Pill, severityTone } from "@/features/internal/tower-ui"
import { railItemsFor, TOWER_SECTIONS, type NavBand, type RailItem, type TowerSection } from "@/features/internal/tower-nav"
import * as W from "@/features/tradechain/demo-world"

/* ── the primary icon rail ─────────────────────────────────────────── */

const DOT_CLASS = {
  ok: "bg-status-success",
  warn: "bg-status-warning",
  crit: "bg-destructive",
  brand: "bg-amama-deep",
  muted: "bg-muted-foreground/40",
} as const

/**
 * The workspace spine. Nine icons, always in the same order, always in the
 * same place — the one part of the product that never changes shape, so
 * it becomes muscle memory rather than something to read.
 */
function PrimaryRail({ activeId }: { activeId?: string }) {
  // Grouped into the three jobs the business has — sell, execute, settle.
  // The gap between bands is the only separator; a rule would be noise.
  const bands: NavBand[] = ["commercial", "execution", "back-office"]

  return (
    <nav
      aria-label="Sections"
      className="flex h-full w-[68px] shrink-0 flex-col items-center gap-3 overflow-y-auto rounded-[24px] border border-border bg-muted bg-[repeating-linear-gradient(-45deg,var(--surface-border)_0px,var(--surface-border)_1px,transparent_1px,transparent_7px)] py-2 scrollbar-none"
    >
      {bands.map((band) => (
        <div key={band} className="flex flex-col items-center gap-0.5 rounded-[22px] bg-card p-1">
          {TOWER_SECTIONS.filter((section) => section.band === band).map((section) => {
            const Icon = section.icon
            const active = section.id === activeId
            return (
              <Tooltip key={section.id}>
                <TooltipTrigger
                  render={
                    <Link
                      href={section.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "grid size-10 shrink-0 place-items-center rounded-full transition-colors",
                        active
                          ? "border border-amama-foreground bg-amama text-amama-foreground"
                          : "text-foreground/60 hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="size-[17px]" strokeWidth={2.25} />
                      <span className="sr-only">{section.label}</span>
                    </Link>
                  }
                />
                <TooltipContent side="right">{section.label}</TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

/* ── the contextual rail ───────────────────────────────────────────── */

/**
 * The column that changes with the section — threads under Conversations,
 * trades with a stage dot under POs & Trades, and so on. Same visual
 * language as the existing dashboard sidebar (one rounded island on a
 * muted ground, pill rows, brand-green selection) so it reads as the same
 * product, not a second one bolted on.
 */
function ContextualRail({ section }: { section: TowerSection }) {
  const pathname = usePathname()
  const items = React.useMemo(() => railItemsFor(section.id), [section.id])

  return (
    <div className="flex h-full w-[264px] shrink-0 flex-col overflow-hidden rounded-[24px] border border-border bg-muted bg-[repeating-linear-gradient(-45deg,var(--surface-border)_0px,var(--surface-border)_1px,transparent_1px,transparent_7px)]">
      <header className="shrink-0 px-4 pt-4 pb-2">
        <Eyebrow>{section.railLabel}</Eyebrow>
        <p className="mt-1 text-[15px] font-semibold tracking-tight">{section.label}</p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 scrollbar-none">
        <div className="flex flex-col gap-0.5 rounded-[20px] bg-card p-1">
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-[12px] text-muted-foreground">Nothing here yet.</p>
          ) : (
            items.map((item) => <RailRow key={item.id} item={item} pathname={pathname} />)
          )}
        </div>
      </div>
    </div>
  )
}

function RailRow({ item, pathname }: { item: RailItem; pathname: string }) {
  const base = item.href.split("?")[0]
  const active = pathname === base
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-full px-3 py-2 transition-colors",
        active
          ? "border border-amama-foreground bg-amama text-amama-foreground"
          : "text-foreground/80 hover:bg-muted"
      )}
    >
      {item.dot ? (
        <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", DOT_CLASS[item.dot])} />
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium">{item.label}</span>
        {item.meta ? (
          <span className={cn("block truncate text-[11px]", active ? "text-amama-foreground/70" : "text-muted-foreground")}>
            {item.meta}
          </span>
        ) : null}
      </span>
      {item.badge ? (
        <span className="grid size-4 shrink-0 place-items-center rounded-full bg-amama-deep text-[10px] font-bold text-white tabular-nums">
          {item.badge}
        </span>
      ) : null}
    </Link>
  )
}

/* ── global search / command palette ───────────────────────────────── */

/**
 * One box over the whole world. Every trade, lot, pallet, container,
 * document, person, RFQ, quote, term sheet, PO, product, variant and stage
 * is in the index — and a hit opens the peek panel rather than navigating,
 * so searching never costs you the screen you were on.
 */
function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [query, setQuery] = React.useState("")
  const { open: openPeek } = usePeek()
  const hits = React.useMemo(() => W.search(query, 14), [query])

  // Clear on the way out rather than in an effect watching `open` — the
  // close is the event, so it is the place to reset.
  const setOpen = (next: boolean) => {
    if (!next) setQuery("")
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent showCloseButton={false} className="max-w-xl overflow-hidden p-0">
        <DialogTitle className="sr-only">Search everything</DialogTitle>
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search trades, lots, containers, documents, people…"
            className="w-full bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
          />
          <kbd className="shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>

        <div className="max-h-[22rem] overflow-y-auto">
          {query.trim().length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">
              Try a transaction id, a lot number, a container, a grower or a document name.
            </p>
          ) : hits.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">
              Nothing matches “{query.trim()}”.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {hits.map((hit) => (
                <button
                  key={`${hit.ref.kind}-${hit.ref.id}`}
                  type="button"
                  onClick={() => {
                    openPeek(hit.ref)
                    setOpen(false)
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-start transition-colors hover:bg-muted"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{hit.title}</span>
                    <span className="block truncate text-[12px] text-muted-foreground">{hit.subtitle}</span>
                  </span>
                  <Pill tone="muted">{hit.group}</Pill>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ── notifications ─────────────────────────────────────────────────── */

const relative = (iso: string): string => {
  const minutes = Math.round((new Date(W.NOW).getTime() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

function NotificationBell() {
  const { open: openPeek } = usePeek()
  const unread = W.unreadNotifications().length
  const ordered = React.useMemo(
    () => [...W.NOTIFICATIONS].sort((a, b) => b.at.localeCompare(a.at)),
    []
  )

  return (
    <Popover>
      <PopoverTrigger
        aria-label={`Notifications — ${unread} unread`}
        className="relative grid size-9 place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground"
      >
        <BellIcon className="size-[18px]" />
        {unread > 0 ? (
          <span className="absolute end-1.5 top-1.5 grid min-w-3.5 place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white tabular-nums">
            {unread}
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="w-[26rem] p-0">
        <header className="flex items-baseline justify-between border-b border-border px-4 py-3">
          <p className="text-[14px] font-semibold">Notifications</p>
          <p className="text-[12px] text-muted-foreground">{unread} unread</p>
        </header>
        <div className="max-h-[24rem] divide-y divide-border overflow-y-auto">
          {ordered.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => openPeek({ kind: "notification", id: notification.id })}
              className={cn(
                "flex w-full flex-col items-start gap-1 px-4 py-3 text-start transition-colors hover:bg-muted",
                !notification.read && "bg-amama-subtle/40"
              )}
            >
              <span className="flex w-full items-center gap-2">
                <Pill tone={severityTone(notification.level)}>{notification.level}</Pill>
                <span className="ms-auto shrink-0 text-[11px] text-muted-foreground">{relative(notification.at)}</span>
              </span>
              <span className="text-[13px] font-medium">{notification.title}</span>
              <span className="line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">{notification.body}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/* ── the bottom activity strip ─────────────────────────────────────── */

const KIND_TONE: Record<W.EventKind, "ok" | "warn" | "crit" | "brand" | "muted"> = {
  "stage-advanced": "ok", document: "brand", message: "muted", "qc-decision": "warn",
  excursion: "crit", notification: "crit", commercial: "brand", logistics: "muted",
}

/**
 * The persistent strip along the bottom — the last five things that
 * happened anywhere in the business, on every screen. Clicking one opens
 * its record in the peek panel, so the strip is a way *into* the data
 * rather than a read-only ticker.
 */
function ActivityStrip() {
  const { open } = usePeek()
  const events = React.useMemo(() => W.recentEvents(5), [])

  return (
    <div className="flex h-11 shrink-0 items-center gap-1 overflow-x-auto rounded-[20px] border border-border bg-muted px-2 scrollbar-none">
      <span className="shrink-0 ps-2 pe-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
        Activity
      </span>
      {events.map((event) => (
        <button
          key={event.id}
          type="button"
          onClick={() => event.subject && open(event.subject)}
          className="flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 transition-colors hover:bg-card"
        >
          <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", DOT_CLASS[KIND_TONE[event.kind]])} />
          <span className="max-w-[24rem] truncate text-[12px] text-foreground/80">{event.summary}</span>
          <span className="shrink-0 text-[11px] text-muted-foreground">{relative(event.at)}</span>
        </button>
      ))}
    </div>
  )
}

export { PrimaryRail, ContextualRail, CommandPalette, NotificationBell, ActivityStrip, relative }
