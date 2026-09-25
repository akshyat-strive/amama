"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { COLD_LEG_LABEL, type TempPoint } from "@/features/tradechain/trade-file"
import { formatStamp, shortDay } from "@/features/trades/trade-format"

const WIDTH = 760
const HEIGHT = 240
const PAD = { left: 36, right: 12, top: 26, bottom: 26 }
const PLOT_W = WIDTH - PAD.left - PAD.right
const PLOT_H = HEIGHT - PAD.top - PAD.bottom

type LegRun = { leg: TempPoint["leg"]; start: number; end: number }

function runsOf(points: TempPoint[]): LegRun[] {
  const runs: LegRun[] = []
  points.forEach((point, index) => {
    const last = runs[runs.length - 1]
    if (last && last.leg === point.leg) last.end = index
    else runs.push({ leg: point.leg, start: index, end: index })
  })
  return runs
}

/**
 * Pulp temperature against set point, harvest onward. One series, so no
 * legend box — the key underneath names the three marks. The x axis is
 * real time, not sample index, so a two-hour excursion reads as two hours
 * whatever the sampling density around it.
 */
function TemperatureChart({ points }: { points: TempPoint[] }) {
  const [active, setActive] = React.useState<number | null>(null)
  const svgRef = React.useRef<SVGSVGElement>(null)

  const times = points.map((point) => new Date(point.at).getTime())
  const t0 = times[0]
  const t1 = times[times.length - 1]
  const temps = points.flatMap((point) => (point.setpointC === null ? [point.tempC] : [point.tempC, point.setpointC]))
  const maxC = Math.ceil(Math.max(...temps) / 5) * 5
  const minC = Math.min(0, Math.floor(Math.min(...temps) / 5) * 5)

  const xAt = (time: number) => PAD.left + ((time - t0) / Math.max(t1 - t0, 1)) * PLOT_W
  const yAt = (tempC: number) => PAD.top + (1 - (tempC - minC) / Math.max(maxC - minC, 1)) * PLOT_H

  const grid: number[] = []
  for (let value = minC; value <= maxC; value += 5) grid.push(value)

  const runs = runsOf(points)
  const line = points.map((point, index) => `${xAt(times[index]).toFixed(1)},${yAt(point.tempC).toFixed(1)}`).join(" ")

  // The set point only exists once the cargo is under control, so it is
  // drawn as separate segments rather than one line dropping to zero.
  const setpointSegments: string[] = []
  let current: string[] = []
  points.forEach((point, index) => {
    if (point.setpointC === null) {
      if (current.length > 1) setpointSegments.push(current.join(" "))
      current = []
      return
    }
    current.push(`${xAt(times[index]).toFixed(1)},${yAt(point.setpointC).toFixed(1)}`)
  })
  if (current.length > 1) setpointSegments.push(current.join(" "))

  const excursionRuns: { start: number; end: number }[] = []
  points.forEach((point, index) => {
    if (!point.excursion) return
    const last = excursionRuns[excursionRuns.length - 1]
    if (last && last.end === index - 1) last.end = index
    else excursionRuns.push({ start: index, end: index })
  })

  const dayTicks: number[] = []
  const span = t1 - t0
  const tickEvery = span > 30 * 86_400_000 ? 7 : span > 10 * 86_400_000 ? 3 : 1
  const firstDay = new Date(t0)
  firstDay.setHours(0, 0, 0, 0)
  for (let time = firstDay.getTime() + 86_400_000; time < t1; time += tickEvery * 86_400_000) dayTicks.push(time)

  const nearest = (clientX: number): number => {
    const svg = svgRef.current
    if (!svg) return 0
    const box = svg.getBoundingClientRect()
    const x = ((clientX - box.left) / box.width) * WIDTH
    const time = t0 + ((x - PAD.left) / PLOT_W) * (t1 - t0)
    let best = 0
    for (let index = 1; index < times.length; index += 1) {
      if (Math.abs(times[index] - time) < Math.abs(times[best] - time)) best = index
    }
    return best
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
    event.preventDefault()
    setActive((index) => {
      const from = index ?? 0
      return event.key === "ArrowLeft" ? Math.max(0, from - 1) : Math.min(points.length - 1, from + 1)
    })
  }

  const point = active !== null ? points[active] : null
  const tooltipLeft = active !== null ? (xAt(times[active]) / WIDTH) * 100 : 0

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-amama-deep/40"
        role="img"
        aria-label={`Temperature against set point, ${points.length} readings from ${shortDay(points[0].at)} to ${shortDay(points[points.length - 1].at)}`}
        tabIndex={0}
        onPointerMove={(event) => setActive(nearest(event.clientX))}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive((index) => index ?? points.length - 1)}
        onBlur={() => setActive(null)}
        onKeyDown={onKeyDown}
      >
        {grid.map((value) => (
          <g key={value}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={yAt(value)} y2={yAt(value)} className="stroke-border" strokeWidth={1} />
            <text x={PAD.left - 7} y={yAt(value) + 3} textAnchor="end" className="fill-muted-foreground text-[10px] tabular-nums">
              {value}°
            </text>
          </g>
        ))}

        {runs.map((run, index) => {
          const x0 = xAt(times[run.start])
          const x1 = index < runs.length - 1 ? xAt(times[runs[index + 1].start]) : xAt(times[run.end])
          const wide = x1 - x0 > 58
          return (
            <g key={run.leg + run.start}>
              {index > 0 ? (
                <line x1={x0} x2={x0} y1={PAD.top - 12} y2={PAD.top + PLOT_H} className="stroke-border" strokeDasharray="2 3" />
              ) : null}
              {wide ? (
                <text x={x0 + 4} y={PAD.top - 5} className="fill-muted-foreground text-[9.5px]">
                  {COLD_LEG_LABEL[run.leg]}
                </text>
              ) : null}
            </g>
          )
        })}

        {excursionRuns.map((run) => {
          const x0 = xAt(times[Math.max(0, run.start - 1)])
          const x1 = xAt(times[Math.min(points.length - 1, run.end + 1)])
          return <rect key={run.start} x={x0} y={PAD.top} width={Math.max(x1 - x0, 4)} height={PLOT_H} className="fill-destructive/10" />
        })}

        {setpointSegments.map((segment) => (
          <polyline key={segment.slice(0, 24)} points={segment} className="fill-none stroke-muted-foreground" strokeWidth={1.25} strokeDasharray="5 4" />
        ))}

        <polyline points={line} className="fill-none stroke-amama-deep" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {points.map((sample, index) =>
          sample.excursion ? (
            <circle key={sample.at} cx={xAt(times[index])} cy={yAt(sample.tempC)} r={4} className="fill-destructive stroke-card" strokeWidth={2} />
          ) : null
        )}

        {dayTicks.map((time) => (
          <text key={time} x={xAt(time)} y={HEIGHT - 8} textAnchor="middle" className="fill-muted-foreground text-[10px]">
            {shortDay(new Date(time).toISOString())}
          </text>
        ))}

        {active !== null && point ? (
          <g pointerEvents="none">
            <line x1={xAt(times[active])} x2={xAt(times[active])} y1={PAD.top} y2={PAD.top + PLOT_H} className="stroke-foreground/40" strokeWidth={1} />
            <circle cx={xAt(times[active])} cy={yAt(point.tempC)} r={4.5} className={cn(point.excursion ? "fill-destructive" : "fill-amama-deep", "stroke-card")} strokeWidth={2} />
          </g>
        ) : null}
      </svg>

      {point ? (
        <div
          className="pointer-events-none absolute top-6 z-10 w-44 rounded-xl border border-border bg-card px-3 py-2 shadow-lg"
          style={{
            left: `${tooltipLeft}%`,
            transform: tooltipLeft > 60 ? "translateX(calc(-100% - 10px))" : "translateX(10px)",
          }}
        >
          <p className="text-[18px] leading-tight font-semibold text-foreground tabular-nums">{point.tempC.toFixed(1)} °C</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span aria-hidden className="h-0.5 w-3 rounded-full bg-muted-foreground" />
            {point.setpointC === null ? "No set point yet" : `Set point ${point.setpointC} °C`}
          </p>
          <p className="text-[11px] text-muted-foreground tabular-nums">{point.humidityPct}% RH</p>
          <p className="mt-1 text-[11px] font-medium text-foreground">{COLD_LEG_LABEL[point.leg]}</p>
          <p className="text-[11px] text-muted-foreground tabular-nums">{formatStamp(point.at)}</p>
          {point.excursion ? <p className="mt-1 text-[11px] font-semibold text-destructive">Excursion</p> : null}
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span aria-hidden className="h-0.5 w-5 rounded-full bg-amama-deep" />
          Pulp temperature
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span aria-hidden className="w-5 border-t border-dashed border-muted-foreground" />
          Set point
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span aria-hidden className="size-2 rounded-full bg-destructive" />
          Excursion
        </span>
        <span className="ms-auto text-[11px] text-muted-foreground">Hover or use ← → for readings</span>
      </div>
    </div>
  )
}

/** The table view of the same trace — one row per leg, so every value on
 *  the chart is reachable without hovering. */
function LegTable({ points }: { points: TempPoint[] }) {
  const runs = runsOf(points)
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-[13px]">
        <thead>
          <tr className="text-left text-[11px] font-medium text-muted-foreground">
            <th className="px-5 py-2.5 font-medium">Leg</th>
            <th className="px-3 py-2.5 font-medium">From</th>
            <th className="px-3 py-2.5 text-end font-medium">Range</th>
            <th className="px-3 py-2.5 text-end font-medium">Set point</th>
            <th className="px-5 py-2.5 text-end font-medium">Excursion</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border border-t border-border">
          {runs.map((run) => {
            const slice = points.slice(run.start, run.end + 1)
            const values = slice.map((sample) => sample.tempC)
            const out = slice.filter((sample) => sample.excursion).length
            return (
              <tr key={run.leg + run.start}>
                <td className="px-5 py-2.5 font-medium text-foreground">{COLD_LEG_LABEL[run.leg]}</td>
                <td className="px-3 py-2.5 text-muted-foreground tabular-nums">{formatStamp(slice[0].at)}</td>
                <td className="px-3 py-2.5 text-end text-foreground tabular-nums">
                  {Math.min(...values).toFixed(1)} – {Math.max(...values).toFixed(1)} °C
                </td>
                <td className="px-3 py-2.5 text-end text-muted-foreground tabular-nums">
                  {slice[0].setpointC === null ? "—" : `${slice[0].setpointC} °C`}
                </td>
                <td className={cn("px-5 py-2.5 text-end tabular-nums", out > 0 ? "font-semibold text-destructive" : "text-muted-foreground")}>
                  {out > 0 ? `${out} reading${out === 1 ? "" : "s"}` : "None"}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export { LegTable, TemperatureChart }
