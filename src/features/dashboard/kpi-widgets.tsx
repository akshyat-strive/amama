"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowDownRightIcon, ArrowUpRightIcon, type LucideIcon, ClipboardCheckIcon, ClipboardListIcon, PackageIcon, WalletIcon, WarehouseIcon, ReceiptIcon, ShipIcon, FileSignatureIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { formatInr } from "@/features/marketplace/currency"
import type { DemoOrder } from "@/features/dashboard/demo-data"
import type { OnboardingRole } from "@/features/onboarding/types"

/** A small, stable pseudo-random series from a seed — demo trends that
 *  don't jump around on every render. */
function series(seed: number, length: number, base: number, swing: number) {
  let value = seed % 97
  return Array.from({ length }, (_, index) => {
    value = (value * 37 + 11 + index * 7) % 97
    return Math.max(0, Math.round(base + ((value / 97) * 2 - 1) * swing + index * (swing / length)))
  })
}

/** A micro chart: the trend's shape, no axes. */
function Sparkline({ points, tone = "green" }: { points: number[]; tone?: "green" | "graphite" }) {
  const w = 120
  const h = 36
  const max = Math.max(...points)
  const min = Math.min(...points)
  const span = max - min || 1
  const coords = points.map((point, index) => [(index / (points.length - 1)) * w, h - 3 - ((point - min) / span) * (h - 6)])
  const line = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")
  const stroke = tone === "green" ? "var(--amama)" : "var(--graphite)"
  const id = React.useId()
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${line} ${w},${h}`} fill={`url(#${id})`} />
      <polyline points={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

type Kpi = { label: string; value: string; caption: string; trend: number[]; icon: LucideIcon; href: string }

function kpisFor(role: OnboardingRole, orders: DemoOrder[]): Kpi[] {
  const tonnes = orders.reduce((sum, order) => sum + order.tonnes, 0)
  const stored = orders.filter((order) => order.gatesCleared >= 3).reduce((sum, order) => sum + order.tonnes, 0)
  const seed = tonnes + orders.length * 13
  if (role === "seller") {
    return [
      { label: "In our lots", value: `${stored} MT`, caption: `≈ ${formatInr(stored * 182_000)} held in amama warehouses`, trend: series(seed, 10, stored, stored / 3 + 4), icon: WarehouseIcon, href: "/seller/dashboard/shipments" },
      { label: "GRNs this month", value: String(orders.length * 3 + 2), caption: "Goods received notes issued", trend: series(seed + 3, 10, orders.length * 3, 4), icon: ClipboardCheckIcon, href: "/seller/dashboard/orders" },
      { label: "RFQs to quote", value: String(Math.max(1, orders.length - 1)), caption: "Buyers waiting on your price", trend: series(seed + 7, 10, orders.length, 3), icon: ClipboardListIcon, href: "/seller/dashboard/rfqs" },
      { label: "Payments due", value: formatInr(tonnes * 61_000), caption: "Released as gates clear", trend: series(seed + 11, 10, tonnes, tonnes / 2), icon: WalletIcon, href: "/seller/dashboard/payments" },
    ]
  }
  return [
    { label: "Spend this season", value: formatInr(tonnes * 214_000), caption: `${tonnes} MT contracted`, trend: series(seed, 10, tonnes, tonnes / 3 + 4), icon: ReceiptIcon, href: "/buyer/dashboard/orders" },
    { label: "Open orders", value: String(orders.length), caption: `${orders.filter((order) => order.gatesCleared >= 4).length} at sea`, trend: series(seed + 3, 10, orders.length, 2), icon: PackageIcon, href: "/buyer/dashboard/orders" },
    { label: "Arriving in 14 days", value: `${orders.filter((order) => order.etaDays <= 14).reduce((sum, order) => sum + order.tonnes, 0)} MT`, caption: "Plan your warehouse slots", trend: series(seed + 7, 10, tonnes / 2, tonnes / 4 + 2), icon: ShipIcon, href: "/buyer/dashboard/orders?tab=eta" },
    { label: "Contracts to sign", value: String(Math.max(1, Math.round(orders.length / 2))), caption: "Term sheets agreed, awaiting you", trend: series(seed + 11, 10, orders.length / 2, 2), icon: FileSignatureIcon, href: "/buyer/dashboard/contracts" },
  ]
}

/** The four numbers each role actually acts on, with the last ten weeks'
 *  trend under each. Each one is a door to its page. */
function KpiWidgets({ role, orders }: { role: OnboardingRole; orders: DemoOrder[] }) {
  const kpis = kpisFor(role, orders)
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => {
        const first = kpi.trend[0] || 1
        const change = Math.round(((kpi.trend[kpi.trend.length - 1] - first) / first) * 100)
        const Icon = kpi.icon
        return (
          <Link key={kpi.label} href={kpi.href} className="group flex flex-col rounded-[20px] bg-card p-2 transition-colors hover:bg-[#ededf1] dark:hover:bg-muted">
            <div className="flex items-center gap-2 px-2 pt-1.5 pb-2 text-[13px] font-medium text-foreground/80">
              <Icon aria-hidden className="size-4 text-amama-deep" />
              {kpi.label}
              <span className={cn("ms-auto inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold tabular-nums", change >= 0 ? "bg-amama-subtle text-amama-deep" : "bg-destructive/10 text-destructive")}>
                {change >= 0 ? <ArrowUpRightIcon className="size-3" /> : <ArrowDownRightIcon className="size-3" />}
                {Math.abs(change)}%
              </span>
            </div>
            <div className="rounded-[14px] bg-background px-3.5 pt-3 pb-2">
              <p className="text-[26px] font-semibold tracking-[-0.025em] tabular-nums">{kpi.value}</p>
              <p className="truncate text-[12.5px] text-muted-foreground">{kpi.caption}</p>
              <div className="mt-2">
                <Sparkline points={kpi.trend} />
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

export { KpiWidgets, Sparkline }
