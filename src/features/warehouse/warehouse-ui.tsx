"use client"

import * as React from "react"
import { CheckCircle2Icon, CircleDashedIcon, PauseCircleIcon, WarehouseIcon, XCircleIcon, SproutIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { QcReport, Warehouse } from "@/features/warehouse/warehouse-store"

/** India's rough outline in lat/lng — enough to place a farm and a
 *  warehouse on, not a survey map. */
const INDIA: [number, number][] = [
  [35.5, 74.5], [34.5, 77.8], [32.5, 79.2], [30.4, 81.2], [28.2, 84.1], [27.4, 88.1], [26.6, 89.6], [27.9, 92.0], [28.2, 95.5], [26.8, 96.5],
  [24.5, 94.3], [22.8, 93.2], [23.6, 91.7], [22.3, 91.8], [21.6, 89.3], [21.5, 87.3], [20.0, 86.4], [17.8, 83.3], [16.3, 81.3], [15.0, 80.1],
  [13.0, 80.3], [10.3, 79.8], [8.1, 77.5], [8.9, 76.5], [11.3, 75.7], [13.9, 74.6], [15.6, 73.7], [18.9, 72.8], [20.7, 72.9], [22.2, 72.6],
  [21.9, 69.5], [23.4, 68.4], [24.3, 69.9], [25.8, 70.4], [27.6, 70.5], [29.1, 73.1], [30.8, 74.0], [32.4, 74.5],
]

const BOUNDS = { minLat: 6.5, maxLat: 36.5, minLng: 67.5, maxLng: 97.5 }
const W = 320
const H = 340

const project = ([lat, lng]: [number, number]): [number, number] => [
  ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * W,
  ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * H,
]

function distanceKm([lat1, lng1]: [number, number], [lat2, lng2]: [number, number]) {
  const rad = (degrees: number) => (degrees * Math.PI) / 180
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.25)
}

/**
 * The first mile: from the grower's farm to the amama warehouse, as a
 * route on a simple map with the road distance and drive time. `progress`
 * (0–1) places the truck along it.
 */
function FarmToWarehouseMap({
  farm,
  warehouse,
  progress,
}: {
  farm: { name: string; place: string; gps: [number, number] }
  warehouse: Warehouse
  progress: number
}) {
  const [fx, fy] = project(farm.gps)
  const [wx, wy] = project(warehouse.gps)
  const cx = (fx + wx) / 2 + (wy - fy) * 0.25
  const cy = (fy + wy) / 2 - (wx - fx) * 0.25
  const t = Math.min(1, Math.max(0, progress))
  const tx = (1 - t) ** 2 * fx + 2 * (1 - t) * t * cx + t ** 2 * wx
  const ty = (1 - t) ** 2 * fy + 2 * (1 - t) * t * cy + t ** 2 * wy
  const km = distanceKm(farm.gps, warehouse.gps)
  const hours = Math.round(km / 45)
  const outline = INDIA.map(project).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")

  return (
    <section aria-label="Farm to warehouse" className="rounded-[24px] bg-card p-2">
      <header className="flex flex-wrap items-baseline justify-between gap-2 px-3 pt-2 pb-3">
        <h2 className="text-[17px] font-semibold tracking-[-0.02em]">Farm to warehouse</h2>
        <p className="text-[13px] text-muted-foreground tabular-nums">
          ~{km.toLocaleString()} km · {hours} h by road
        </p>
      </header>
      <div className="grid gap-3 rounded-[16px] bg-background p-3 sm:grid-cols-[minmax(0,1fr)_220px]">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-[260px] w-full" role="img" aria-label={`Route from ${farm.place} to ${warehouse.city}`}>
          <polygon points={outline} fill="var(--card)" stroke="var(--border)" strokeWidth="1.5" strokeLinejoin="round" />
          <path d={`M${fx},${fy} Q${cx},${cy} ${wx},${wy}`} fill="none" stroke="var(--amama)" strokeOpacity="0.25" strokeWidth="6" strokeLinecap="round" />
          <path d={`M${fx},${fy} Q${cx},${cy} ${wx},${wy}`} fill="none" stroke="var(--amama)" strokeWidth="2.5" strokeDasharray="6 6" strokeLinecap="round" />
          <circle cx={fx} cy={fy} r="7" fill="var(--sun)" stroke="var(--graphite)" strokeWidth="1.5" />
          <circle cx={wx} cy={wy} r="8" fill="var(--amama)" stroke="white" strokeWidth="2" />
          {t > 0 && t < 1 ? (
            <g transform={`translate(${tx},${ty})`}>
              <circle r="9" fill="var(--graphite)" />
              <path d="M-4,-1 h5 l2,2 v2 h-7z" fill="white" />
            </g>
          ) : null}
        </svg>
        <ol className="flex flex-col justify-center gap-4 text-[13.5px]">
          <li className="flex gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-sun text-sun-foreground">
              <SproutIcon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold">{farm.name}</span>
              <span className="block text-muted-foreground">{farm.place}</span>
            </span>
          </li>
          <li className="ms-4 h-6 border-s-2 border-dashed border-amama/40" aria-hidden />
          <li className="flex gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-amama text-white">
              <WarehouseIcon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold">{warehouse.name}</span>
              <span className="block text-muted-foreground">{warehouse.address}</span>
            </span>
          </li>
        </ol>
      </div>
    </section>
  )
}

const VERDICT: Record<QcReport["verdict"], { label: string; icon: React.ElementType; className: string }> = {
  passed: { label: "Passed", icon: CheckCircle2Icon, className: "text-amama-deep bg-amama-subtle" },
  hold: { label: "On hold", icon: PauseCircleIcon, className: "text-status-warning bg-status-warning/12" },
  rejected: { label: "Rejected", icon: XCircleIcon, className: "text-destructive bg-destructive/10" },
  pending: { label: "Pending", icon: CircleDashedIcon, className: "text-muted-foreground bg-muted" },
}

/** One QC report — who checked, when, what was measured, the verdict. */
function QcCard({ title, report }: { title: string; report: QcReport }) {
  const verdict = VERDICT[report.verdict]
  const Icon = verdict.icon
  return (
    <div className="rounded-[16px] bg-background p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[14px] font-semibold">{title}</p>
          <p className="text-[12.5px] text-muted-foreground">
            {report.verdict === "pending" ? "Not checked yet" : `${report.by} · ${new Date(report.at).toLocaleDateString("en", { day: "numeric", month: "short" })}`}
          </p>
        </div>
        <span className={cn("inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-semibold", verdict.className)}>
          <Icon className="size-3.5" />
          {verdict.label}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2">
        {report.checks.map((check) => (
          <div key={check.label} className="rounded-xl bg-card px-2.5 py-2">
            <dt className="text-[11.5px] text-muted-foreground">{check.label}</dt>
            <dd className={cn("text-[14px] font-semibold tabular-nums", !check.ok && "text-destructive")}>{check.value}</dd>
          </div>
        ))}
      </dl>
      {report.note ? <p className="mt-2.5 text-[12.5px] text-muted-foreground">{report.note}</p> : null}
    </div>
  )
}

export { FarmToWarehouseMap, QcCard, VERDICT }
