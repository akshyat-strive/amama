import * as React from "react"

import { cn } from "@/lib/utils"
import type { Tone } from "@/features/trades/trade-format"

const PILL_TONE: Record<Tone, string> = {
  ok: "bg-amama-subtle text-amama-deep",
  warn: "bg-status-warning/10 text-status-warning",
  crit: "bg-destructive/10 text-destructive",
  brand: "bg-foreground/[0.06] text-foreground",
  muted: "bg-muted text-muted-foreground",
}

const DOT_TONE: Record<Tone, string> = {
  ok: "bg-amama-deep",
  warn: "bg-status-warning",
  crit: "bg-destructive",
  brand: "bg-foreground",
  muted: "bg-muted-foreground/40",
}

const TEXT_TONE: Record<Tone, string> = {
  ok: "text-amama-deep",
  warn: "text-status-warning",
  crit: "text-destructive",
  brand: "text-foreground",
  muted: "text-muted-foreground",
}

function Pill({ tone = "muted", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        PILL_TONE[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

function Dot({ tone = "muted", className }: { tone?: Tone; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2 shrink-0 rounded-full", DOT_TONE[tone], className)} />
}

/** Dot + word — the quiet way to show a state; a filled pill is kept for
 *  the states someone has to act on. */
function Status({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  if (tone === "warn" || tone === "crit") return <Pill tone={tone} className={className}>{children}</Pill>
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 text-[12px] font-medium whitespace-nowrap", TEXT_TONE[tone], className)}>
      <Dot tone={tone} />
      {children}
    </span>
  )
}

/** One bordered block with a one-line header. Titles are labels, not
 *  sentences — explanations go behind an `InfoTip` passed as `info`. */
function Panel({
  title,
  info,
  action,
  children,
  className,
  flush = false,
}: {
  title: React.ReactNode
  info?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  flush?: boolean
}) {
  return (
    <section className={cn("overflow-hidden rounded-[20px] border border-border bg-card", className)}>
      <header className="flex min-h-12 items-center justify-between gap-3 px-5 pt-3.5 pb-3">
        <h2 className="flex min-w-0 items-center gap-1 text-[14px] font-semibold text-foreground">
          <span className="truncate">{title}</span>
          {info}
        </h2>
        {action}
      </header>
      <div className={cn(flush ? "border-t border-border" : "px-5 pb-5")}>{children}</div>
    </section>
  )
}

type Fact = { label: string; value: React.ReactNode; info?: React.ReactNode; wide?: boolean }

/** Label above, value below, in columns — the spreadsheet row. */
function Facts({ rows, columns = 3 }: { rows: Fact[]; columns?: 2 | 3 | 4 }) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-x-6 gap-y-4",
        columns === 3 && "lg:grid-cols-3",
        columns === 4 && "lg:grid-cols-4"
      )}
    >
      {rows.map((row) => (
        <div key={row.label} className={cn("min-w-0", row.wide && "col-span-full")}>
          <dt className="flex items-center gap-0.5 text-[12px] text-muted-foreground">
            {row.label}
            {row.info}
          </dt>
          <dd className="mt-0.5 text-[13.5px] font-medium break-words text-foreground">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function Mono({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("font-mono text-[12.5px] tabular-nums", className)}>{children}</span>
}

function StatTile({
  label,
  value,
  caption,
  info,
  tone = "plain",
}: {
  label: string
  value: React.ReactNode
  caption?: React.ReactNode
  info?: React.ReactNode
  tone?: "brand" | "warning" | "critical" | "plain"
}) {
  return (
    <div className="rounded-[20px] border border-border bg-card px-4 py-3.5">
      <p className="flex items-center gap-0.5 text-[12.5px] text-muted-foreground">
        {label}
        {info}
      </p>
      <p
        className={cn(
          "mt-1 text-[24px] leading-tight font-semibold tracking-tight tabular-nums",
          tone === "brand" && "text-amama-deep",
          tone === "warning" && "text-status-warning",
          tone === "critical" && "text-destructive",
          tone === "plain" && "text-foreground"
        )}
      >
        {value}
      </p>
      {caption ? <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{caption}</p> : null}
    </div>
  )
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-border px-5 py-8 text-center text-[13px] text-muted-foreground">
      {children}
    </p>
  )
}

export { Dot, EmptyNote, Facts, Mono, Panel, Pill, StatTile, Status, TEXT_TONE }
export type { Fact }
