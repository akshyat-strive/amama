"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import type { DocStatus, Severity, StageState } from "@/features/tradechain/demo-world"

/**
 * The internal product's visual grammar, taken from the dashboard sidebar:
 *
 *   muted ground  →  labelled group  →  white rounded island  →  pill rows
 *
 * Two UX laws do the work here. **Common region**: an island's rounded
 * white boundary is what says "these things belong together", so nothing
 * inside it needs its own border. **Proximity**: the gap between two
 * islands is larger than the gap between two rows inside one, which is
 * how a reader knows where one idea stops.
 *
 * There is deliberately no subtitle or description slot anywhere in this
 * file. A heading plus the data underneath it should be enough; if a
 * screen needs a paragraph to explain itself, the grouping is wrong.
 */

const TONE_CLASS = {
  ok: "bg-status-success/12 text-status-success",
  warn: "bg-status-warning/12 text-status-warning",
  crit: "bg-destructive/12 text-destructive",
  brand: "bg-amama-subtle text-amama-deep",
  muted: "bg-muted text-muted-foreground",
} as const

export type Tone = keyof typeof TONE_CLASS

export const severityTone = (level: Severity): Tone =>
  level === "CRITICAL" || level === "URGENT"
    ? "crit"
    : level === "WARNING" || level === "ACTION"
      ? "warn"
      : "brand"

export const docStatusTone = (status: DocStatus): Tone =>
  status === "VERIFIED"
    ? "ok"
    : status === "PENDING"
      ? "warn"
      : status === "MISSING" || status === "REJECTED"
        ? "crit"
        : "muted"

export const stageStateTone = (state: StageState): Tone =>
  state === "complete" ? "ok" : state === "in-progress" ? "brand" : state === "blocked" ? "crit" : "muted"

/* ── atoms ─────────────────────────────────────────────────────────── */

function Pill({
  tone = "muted",
  children,
  className,
}: {
  tone?: Tone
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold tracking-wide whitespace-nowrap uppercase",
        TONE_CLASS[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

/** A solid status dot — cheaper to scan than a pill when the label is
 *  already obvious from context. */
function Dot({ tone = "muted", className }: { tone?: Tone; className?: string }) {
  const fill =
    tone === "ok" ? "bg-status-success"
    : tone === "warn" ? "bg-status-warning"
    : tone === "crit" ? "bg-destructive"
    : tone === "brand" ? "bg-amama-deep"
    : "bg-muted-foreground/40"
  return <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", fill, className)} />
}

function Mono({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("font-mono text-[12px] tracking-tight tabular-nums", className)}>{children}</span>
}

/** The group label. Same treatment as the sidebar's own group headers,
 *  which is what ties the two surfaces together. */
function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("text-[10px] font-semibold tracking-wider text-muted-foreground uppercase", className)}>
      {children}
    </span>
  )
}

/* ── structure ─────────────────────────────────────────────────────── */

/** A white island on the muted ground. The only bordered thing on a
 *  screen, and the boundary that groups its contents. */
function Island({
  children,
  className,
  pad = "normal",
}: {
  children: React.ReactNode
  className?: string
  pad?: "none" | "tight" | "normal"
}) {
  return (
    <div
      className={cn(
        "rounded-[24px] bg-card",
        pad === "tight" && "p-1",
        pad === "normal" && "p-4 sm:p-5",
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * A labelled group: the tiny uppercase label, then its island. This is
 * the proximity unit — everything under one label is one idea, and the
 * `gap-5` between groups is what separates ideas from each other.
 */
function Group({
  label,
  count,
  action,
  children,
  className,
  pad = "normal",
}: {
  label: string
  /** Rendered next to the label, so a group can carry its own number
   *  without needing a sentence to say it. */
  count?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  pad?: "none" | "tight" | "normal"
}) {
  return (
    <section className={cn("flex min-w-0 flex-col", className)}>
      <header className="flex h-6 items-center gap-2 px-3">
        <Eyebrow>{label}</Eyebrow>
        {count !== undefined ? (
          <span className="font-mono text-[10px] text-muted-foreground/70 tabular-nums">{count}</span>
        ) : null}
        {action ? <span className="ms-auto">{action}</span> : null}
      </header>
      <Island pad={pad}>{children}</Island>
    </section>
  )
}

/** The page title. Metrics and actions sit beside it; nothing sits under
 *  it. */
function PageHead({
  title,
  action,
  meta,
  className,
}: {
  title: React.ReactNode
  action?: React.ReactNode
  /** Inline chips beside the title — a status, a counter, a countdown. */
  meta?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 px-1", className)}>
      <h1 className="text-[26px] leading-none font-bold tracking-tight">{title}</h1>
      {meta ? <div className="flex flex-wrap items-center gap-1.5">{meta}</div> : null}
      {action ? <div className="ms-auto flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  )
}

/* ── content ───────────────────────────────────────────────────────── */

/**
 * Label/value pairs. Two columns on anything wider than a phone, because
 * a single long column of short values wastes the horizontal space a
 * dense operations screen needs.
 */
function Facts({
  rows,
  columns = 2,
  className,
}: {
  rows: { label: string; value: React.ReactNode; wide?: boolean }[]
  columns?: 1 | 2 | 3
  className?: string
}) {
  return (
    <dl
      className={cn(
        "grid gap-x-8 gap-y-3",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {rows.map((row) => (
        <div key={row.label} className={cn("min-w-0", row.wide && "sm:col-span-full")}>
          <dt className="text-[11px] text-muted-foreground">{row.label}</dt>
          <dd className="mt-0.5 text-[13.5px] leading-snug font-medium text-foreground">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Rows inside an island — pill-shaped, tightly spaced, the same shape as
 *  a sidebar nav item. */
function Rows({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-0.5", className)}>{children}</div>
}

function Row({
  children,
  onClick,
  href,
  active = false,
  className,
}: {
  children: React.ReactNode
  onClick?: () => void
  href?: string
  active?: boolean
  className?: string
}) {
  const classes = cn(
    "flex w-full items-center gap-3 rounded-[18px] px-3 py-2.5 text-start transition-colors",
    active
      ? "border border-amama-foreground bg-amama text-amama-foreground"
      : (onClick || href) && "hover:bg-muted",
    className
  )
  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    )
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {children}
      </button>
    )
  }
  return <div className={classes}>{children}</div>
}

/** A metric. Sits in a `Metrics` strip, never in its own box. */
function Metric({
  label,
  value,
  unit,
  tone = "plain",
  foot,
}: {
  label: string
  value: React.ReactNode
  unit?: string
  tone?: "brand" | "warn" | "crit" | "plain"
  foot?: React.ReactNode
}) {
  return (
    <div className="min-w-0 flex-1 basis-32 px-4 py-3.5">
      <p className="truncate text-[11px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-[22px] leading-none font-semibold tracking-tight tabular-nums",
          tone === "brand" && "text-amama-deep",
          tone === "warn" && "text-status-warning",
          tone === "crit" && "text-destructive",
          tone === "plain" && "text-foreground"
        )}
      >
        {value}
        {unit ? <span className="ms-1 text-[11px] font-medium text-muted-foreground">{unit}</span> : null}
      </p>
      {foot ? <p className="mt-1 truncate text-[11px] text-muted-foreground">{foot}</p> : null}
    </div>
  )
}

/** The metric strip — one island, hairline-divided inside. */
function Metrics({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap divide-x divide-border rounded-[24px] bg-card", className)}>{children}</div>
  )
}

/** A horizontal progress bar. Used where a number alone hides the shape
 *  of the thing — clauses agreed, quantity fulfilled. */
function Meter({
  segments,
  className,
}: {
  segments: { value: number; tone: Tone; label?: string }[]
  className?: string
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1
  const fill = (tone: Tone) =>
    tone === "ok" ? "bg-status-success"
    : tone === "warn" ? "bg-status-warning"
    : tone === "crit" ? "bg-destructive"
    : tone === "brand" ? "bg-amama-deep"
    : "bg-muted-foreground/20"
  return (
    <div className={cn("flex h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      {segments.map((segment, index) => (
        <span
          key={`${segment.label ?? index}`}
          title={segment.label}
          style={{ width: `${(segment.value / total) * 100}%` }}
          className={cn("h-full", fill(segment.tone))}
        />
      ))}
    </div>
  )
}

/** A vertical timeline. One shape for stage history, RFQ activity,
 *  shipment milestones and document trails. */
function Timeline({
  items,
  className,
}: {
  items: { id: string; tone: Tone; title: React.ReactNode; meta?: React.ReactNode; body?: React.ReactNode }[]
  className?: string
}) {
  return (
    <ol className={cn("flex flex-col", className)}>
      {items.map((item, index) => (
        <li key={item.id} className="flex gap-3">
          <div className="flex w-3 shrink-0 flex-col items-center pt-1.5">
            <Dot tone={item.tone} />
            {index < items.length - 1 ? <span className="w-px flex-1 bg-border" /> : null}
          </div>
          <div className={cn("min-w-0 flex-1", index < items.length - 1 && "pb-4")}>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-[13px] font-medium text-foreground">{item.title}</span>
              {item.meta ? <span className="text-[11px] text-muted-foreground">{item.meta}</span> : null}
            </div>
            {item.body ? <div className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">{item.body}</div> : null}
          </div>
        </li>
      ))}
    </ol>
  )
}

function EmptyState({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  title: string
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <Icon aria-hidden className="size-5 text-muted-foreground" />
      <p className="text-[14px] font-semibold">{title}</p>
    </div>
  )
}

/** A table that keeps the island's rounded shape — header row in the
 *  muted tone, body rows hairline-separated. */
function TableHead({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 px-3 pb-2", className)}>{children}</div>
  )
}

export {
  Pill,
  Dot,
  Mono,
  Eyebrow,
  Island,
  Group,
  PageHead,
  Facts,
  Rows,
  Row,
  Metric,
  Metrics,
  Meter,
  Timeline,
  EmptyState,
  TableHead,
}
