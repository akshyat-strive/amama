"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import type { TradeStatus } from "@/features/dashboard/dashboard-ui"
import type { StatusBreakdown, VolumePoint } from "@/features/dashboard/demo-data"

const LINE_COLOR = "var(--amama)"

/* ── season volume ─────────────────────────────────────────────────────── */

const W = 640
const H = 200
const PAD = { left: 34, right: 14, top: 14, bottom: 26 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

function niceMax(value: number): number {
  if (value <= 0) return 10
  const step = 10 ** Math.floor(Math.log10(value))
  return Math.ceil(value / step) * step
}

/**
 * This season as an emerald area with a marker on every month, last
 * season as a dashed reference line. Hover (or arrow keys) snaps a
 * crosshair to the nearest month and reads both seasons plus the
 * month-over-month change.
 */
function SeasonVolumeChart({ points }: { points: VolumePoint[] }) {
  const gradientId = React.useId()
  const [active, setActive] = React.useState<number | null>(null)
  const svgRef = React.useRef<SVGSVGElement>(null)

  const max = niceMax(Math.max(...points.flatMap((point) => [point.volume, point.lastSeason])))
  const xAt = (index: number) => PAD.left + (index / Math.max(points.length - 1, 1)) * PLOT_W
  const yAt = (value: number) => PAD.top + (1 - value / max) * PLOT_H
  const ticks = [0, max / 2, max]

  const line = points.map((point, index) => `${xAt(index)},${yAt(point.volume)}`).join(" ")
  const area = `${xAt(0)},${yAt(0)} ${line} ${xAt(points.length - 1)},${yAt(0)}`
  const last = points.map((point, index) => `${xAt(index)},${yAt(point.lastSeason)}`).join(" ")

  const pick = (clientX: number) => {
    const box = svgRef.current?.getBoundingClientRect()
    if (!box) return
    const x = ((clientX - box.left) / box.width) * W
    const index = Math.round(((x - PAD.left) / PLOT_W) * (points.length - 1))
    setActive(Math.min(points.length - 1, Math.max(0, index)))
  }

  const point = active !== null ? points[active] : null
  const previous = active !== null && active > 0 ? points[active - 1] : null
  const left = active !== null ? (xAt(active) / W) * 100 : 0

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-amama-deep/40"
        role="img"
        aria-label={`Season volume by month, ${points[0]?.month} to ${points[points.length - 1]?.month}`}
        tabIndex={0}
        onPointerMove={(event) => pick(event.clientX)}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive((index) => index ?? points.length - 1)}
        onBlur={() => setActive(null)}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
          event.preventDefault()
          setActive((index) => {
            const from = index ?? points.length - 1
            return event.key === "ArrowLeft" ? Math.max(0, from - 1) : Math.min(points.length - 1, from + 1)
          })
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={LINE_COLOR} stopOpacity={0.32} />
            <stop offset="100%" stopColor={LINE_COLOR} stopOpacity={0} />
          </linearGradient>
        </defs>

        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={W - PAD.right} y1={yAt(tick)} y2={yAt(tick)} className="stroke-border" strokeWidth={1} />
            <text x={PAD.left - 8} y={yAt(tick) + 3.5} textAnchor="end" className="fill-muted-foreground text-[10px] tabular-nums">
              {tick}
            </text>
          </g>
        ))}

        <polygon points={area} fill={`url(#${gradientId})`} />
        <polyline points={last} fill="none" className="stroke-muted-foreground/60" strokeWidth={1.5} strokeDasharray="4 4" />
        <polyline points={line} fill="none" stroke={LINE_COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {active !== null ? (
          <line x1={xAt(active)} x2={xAt(active)} y1={PAD.top} y2={PAD.top + PLOT_H} className="stroke-foreground/25" strokeWidth={1} />
        ) : null}

        {points.map((entry, index) => (
          <circle
            key={entry.month}
            cx={xAt(index)}
            cy={yAt(entry.volume)}
            r={active === index ? 5.5 : 4}
            className="fill-card"
            stroke={LINE_COLOR}
            strokeWidth={2}
          />
        ))}

        {points.map((entry, index) => (
          <text key={entry.month} x={xAt(index)} y={H - 8} textAnchor="middle" className="fill-muted-foreground text-[10.5px]">
            {entry.month}
          </text>
        ))}
      </svg>

      {point ? (
        <div
          className="pointer-events-none absolute top-2 z-10 w-40 rounded-xl border border-border bg-background px-3 py-2 shadow-lg"
          style={{ left: `${left}%`, transform: left > 60 ? "translateX(calc(-100% - 10px))" : "translateX(10px)" }}
        >
          <p className="text-[11px] font-medium text-muted-foreground">{point.month}</p>
          <p className="text-[17px] leading-tight font-semibold text-foreground tabular-nums">{point.volume} MT</p>
          <p className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
            <span>Last season</span>
            <span>{point.lastSeason} MT</span>
          </p>
          {previous ? (
            <p className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
              <span>vs {previous.month}</span>
              <span className="font-semibold text-amama-deep">+{point.volume - previous.volume} MT</span>
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-1 flex items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-0.5 w-4 rounded-full" style={{ background: LINE_COLOR }} />
          This season
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="w-4 border-t border-dashed border-muted-foreground/70" />
          Last season
        </span>
      </div>
    </div>
  )
}

/* ── shipment status ───────────────────────────────────────────────────── */

const STATUS_META: Record<TradeStatus, { label: string; stroke: string; dot: string }> = {
  "on-track": { label: "On track", stroke: "stroke-amama-deep", dot: "bg-amama-deep" },
  watch: { label: "Delayed", stroke: "stroke-status-warning", dot: "bg-status-warning" },
  critical: { label: "Action needed", stroke: "stroke-destructive", dot: "bg-destructive" },
}

const ORDER: TradeStatus[] = ["on-track", "watch", "critical"]

/** One ring split into status segments with a hairline gap between them,
 *  the on-track share in the middle, and an explicit legend — no colour
 *  to decode. */
function StatusDonut({ breakdown }: { breakdown: StatusBreakdown[] }) {
  const counts = ORDER.map((status) => ({ status, count: breakdown.find((entry) => entry.status === status)?.count ?? 0 }))
  const total = counts.reduce((sum, entry) => sum + entry.count, 0)
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const gap = total > 1 ? 4 : 0
  const onTrack = total ? Math.round(((counts[0]?.count ?? 0) / total) * 100) : 0

  const present = counts.filter((entry) => entry.count > 0)
  const segments = present.map((entry, index) => {
    const offset = present.slice(0, index).reduce((sum, before) => sum + (before.count / total) * circumference, 0)
    const length = (entry.count / total) * circumference
    return { ...entry, dash: Math.max(length - gap, 0.1), offset }
  })

  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 140 140" className="size-32 shrink-0 -rotate-90" role="img" aria-label={`${onTrack}% of shipments on track`}>
        <circle cx={70} cy={70} r={radius} fill="none" className="stroke-muted" strokeWidth={14} />
        {segments.map((segment) => (
          <circle
            key={segment.status}
            cx={70}
            cy={70}
            r={radius}
            fill="none"
            className={STATUS_META[segment.status].stroke}
            strokeWidth={14}
            strokeDasharray={`${segment.dash} ${circumference}`}
            strokeDashoffset={-segment.offset}
          >
            <title>{`${STATUS_META[segment.status].label}: ${segment.count}`}</title>
          </circle>
        ))}
        <g className="rotate-90" style={{ transformOrigin: "70px 70px" }}>
          <text x={70} y={70} textAnchor="middle" className="fill-foreground text-[26px] font-semibold tabular-nums">
            {onTrack}%
          </text>
          <text x={70} y={88} textAnchor="middle" className="fill-muted-foreground text-[10.5px]">
            on track
          </text>
        </g>
      </svg>

      <ul className="flex min-w-0 flex-1 flex-col gap-2.5">
        {counts.map((entry) => (
          <li key={entry.status} className="flex items-center gap-2.5 text-[13px]">
            <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", STATUS_META[entry.status].dot)} />
            <span className="min-w-0 flex-1 truncate text-foreground">{STATUS_META[entry.status].label}</span>
            <span className="font-semibold text-foreground tabular-nums">{entry.count}</span>
            <span className="w-9 text-end text-[12px] text-muted-foreground tabular-nums">
              {total ? Math.round((entry.count / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export { STATUS_META, SeasonVolumeChart, StatusDonut }
