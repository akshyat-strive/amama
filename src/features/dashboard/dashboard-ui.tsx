import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Shared dashboard primitives — plain, on-brand components built from the
 * same visual language as the rest of the app (rounded cards, soft
 * hairline borders, Inter throughout). An earlier pass here copied the
 * mono/uppercase "ops deck" look straight out of a client-supplied
 * reference PDF; that was a mockup for illustration, not a design system,
 * so none of it survives here.
 */

function Panel({
  title,
  subtitle,
  children,
  className,
  action,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
}) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card", className)}>
      <header className="flex items-start justify-between gap-3 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 text-[13px] text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </header>
      <div className="border-t border-border">{children}</div>
    </section>
  )
}

export type TradeStatus = "on-track" | "watch" | "critical"

const statusStyles: Record<TradeStatus, { label: string; pill: string; bar: string }> = {
  "on-track": {
    label: "On track",
    pill: "bg-amama-subtle text-amama-deep",
    bar: "bg-amama-deep",
  },
  watch: {
    label: "Watch",
    pill: "bg-status-warning/10 text-status-warning",
    bar: "bg-status-warning",
  },
  critical: {
    label: "Critical",
    pill: "bg-destructive/10 text-destructive",
    bar: "bg-destructive",
  },
}

function StatusPill({ status }: { status: TradeStatus }) {
  const style = statusStyles[status]
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[12px] font-medium",
        style.pill
      )}
    >
      {style.label}
    </span>
  )
}

/** A headline number with its unit and a line of context. */
function StatCard({
  label,
  value,
  unit,
  caption,
  tone = "brand",
}: {
  label: string
  value: string
  unit?: string
  caption?: string
  tone?: "brand" | "warning" | "plain"
}) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-4">
      <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1.5 text-[28px] leading-none font-semibold tracking-tight tabular-nums",
          tone === "brand" && "text-amama-deep",
          tone === "warning" && "text-status-warning",
          tone === "plain" && "text-foreground"
        )}
      >
        {value}
        {unit ? (
          <span className="ms-1 align-baseline text-[13px] font-medium text-muted-foreground">
            {unit}
          </span>
        ) : null}
      </p>
      {caption ? (
        <p className="mt-1.5 text-[12px] text-muted-foreground">{caption}</p>
      ) : null}
    </div>
  )
}

/** The gate bar from the buyer portal concept: a shipment clears a fixed
 *  number of checkpoints, so the track has no segments but the count beside
 *  it is what people actually read off it. */
function GateBar({
  cleared,
  total,
  status,
}: {
  cleared: number
  total: number
  status: TradeStatus
}) {
  const percent = total === 0 ? 0 : Math.round((cleared / total) * 100)
  return (
    <div className="flex items-center gap-3">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={cleared}
        aria-label={`${cleared} of ${total} gates cleared`}
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn("h-full rounded-full transition-[width]", statusStyles[status].bar)}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="shrink-0 text-[12px] text-muted-foreground tabular-nums">
        {cleared}/{total}
      </span>
    </div>
  )
}

/** One step of a traceability record — a dot, a stage name, and the
 *  evidence line under it. */
function TraceStep({
  stage,
  detail,
  done,
}: {
  stage: string
  detail: string
  done: boolean
}) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden
        className={cn(
          "mt-1.5 size-1.5 shrink-0 rounded-full",
          done ? "bg-amama-deep" : "bg-border"
        )}
      />
      <div className="min-w-0">
        <p
          className={cn(
            "text-[12px] font-semibold",
            done ? "text-amama-deep" : "text-muted-foreground"
          )}
        >
          {stage}
        </p>
        <p className="text-[13px] leading-relaxed text-foreground">{detail}</p>
      </div>
    </li>
  )
}

export { Panel, StatusPill, StatCard, GateBar, TraceStep }
