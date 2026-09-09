"use client"

import * as React from "react"
import { QrCode } from "lucide-react"

import { cn } from "@/lib/utils"
import { EvilAreaChart } from "@/components/evilcharts/charts/recharts-area-chart"
import { EvilRadialChart } from "@/components/evilcharts/charts/recharts-radial-chart"
import { type ChartConfig } from "@/components/evilcharts/ui/recharts-chart"
import { GateBar, Panel, StatCard, StatusPill, TraceStep } from "@/features/dashboard/dashboard-ui"
import {
  buildLotTrace,
  buildOrderBook,
  buildStatusBreakdown,
  buildVolumeSeries,
  TOTAL_GATES,
  type DemoOrder,
} from "@/features/dashboard/demo-data"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import type { OnboardingRole } from "@/features/onboarding/types"

const statusConfig = {
  "on-track": { label: "On track", colors: { light: ["#047d4e"], dark: ["#34d399"] } },
  watch: { label: "Watch", colors: { light: ["#d97706"], dark: ["#fbbf24"] } },
  critical: { label: "Critical", colors: { light: ["#dc2626"], dark: ["#f87171"] } },
} satisfies ChartConfig

const volumeConfig = {
  volume: { label: "Volume", colors: { light: ["#047d4e"], dark: ["#34d399"] } },
} satisfies ChartConfig

const copy: Record<
  OnboardingRole,
  {
    description: string
    bookTitle: string
    bookSubtitle: string
    volumeSubtitle: string
    stats: (orders: DemoOrder[]) => React.ComponentProps<typeof StatCard>[]
  }
> = {
  buyer: {
    description:
      "Every order you've placed, where it physically is, and what still has to clear before it sails.",
    bookTitle: "Order book",
    bookSubtitle: "What you'd otherwise be phoning us about",
    volumeSubtitle: "Tonnes received across the season",
    stats: (orders) => [
      {
        label: "Active orders",
        value: String(orders.length),
        caption: `${orders.filter((o) => o.status === "on-track").length} on track`,
      },
      {
        label: "Volume in transit",
        value: String(orders.reduce((total, order) => total + order.tonnes, 0)),
        unit: "MT",
        caption: `Across ${new Set(orders.map((o) => o.crop)).size} commodity lines`,
      },
      {
        label: "Nearest arrival",
        value: String(Math.min(...orders.map((order) => order.etaDays))),
        unit: "days",
        caption: "Estimated, updated on every vessel event",
      },
      {
        label: "Needs attention",
        value: String(orders.filter((order) => order.status !== "on-track").length),
        caption: "Watch or critical files",
        tone: "warning" as const,
      },
    ],
  },
  seller: {
    description:
      "Every consignment you've supplied, the lot it became, and how far it has moved toward the buyer.",
    bookTitle: "Your consignments",
    bookSubtitle: "Each one carries its own lot identity from field QC onward",
    volumeSubtitle: "Tonnes dispatched across the season",
    stats: (orders) => [
      {
        label: "Live lots",
        value: String(orders.length),
        caption: `${orders.filter((o) => o.gatesCleared >= 4).length} at container stage`,
      },
      {
        label: "Volume dispatched",
        value: String(orders.reduce((total, order) => total + order.tonnes, 0)),
        unit: "MT",
        caption: "Season to date",
      },
      {
        label: "Farmgate uplift",
        value: "+17",
        unit: "%",
        caption: "Versus local mandi rate, same grade, same day",
      },
      {
        label: "Needs attention",
        value: String(orders.filter((order) => order.status !== "on-track").length),
        caption: "Watch or critical files",
        tone: "warning" as const,
      },
    ],
  },
}

/**
 * The dashboard overview: an order book on the left and, beside it, the
 * traceability record behind whichever file is selected, plus a season
 * trend and a status breakdown up top. Both roles get the same instrument
 * — a buyer is watching a shipment arrive and a seller is watching their
 * lot leave, but it's the same trade and the same gates either way.
 */
function DashboardOverview({ role }: { role: OnboardingRole }) {
  const { draft } = useOnboarding()
  const person = role === "buyer" ? draft.buyer : draft.seller
  const firstName = person.fullName.trim().split(" ")[0]
  const content = copy[role]

  const orders = React.useMemo(
    () =>
      buildOrderBook({
        crops: role === "buyer" ? draft.buyer.sourcing : draft.seller.produce,
        country: person.country,
        role,
        counterparty:
          role === "buyer"
            ? draft.buyer.companyName || "Your company"
            : draft.seller.farmName || "Your farm",
      }),
    [
      role,
      draft.buyer.sourcing,
      draft.seller.produce,
      person.country,
      draft.buyer.companyName,
      draft.seller.farmName,
    ]
  )

  const volumeSeries = React.useMemo(() => buildVolumeSeries(orders), [orders])
  const statusBreakdown = React.useMemo(() => buildStatusBreakdown(orders), [orders])

  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const selected = orders.find((order) => order.id === selectedId) ?? orders[0]
  const trace = selected
    ? buildLotTrace(selected, draft.seller.farmName || "Sanjay Patil")
    : []

  return (
    <div>
      <h1 className="text-[24px] font-bold tracking-tight">
        {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
      </h1>
      <p className="mt-1 max-w-2xl text-[15px] text-muted-foreground">
        {content.description}
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {content.stats(orders).map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel title="Season volume" subtitle={content.volumeSubtitle}>
          <div className="h-56 p-2">
            <EvilAreaChart
              data={volumeSeries}
              config={volumeConfig}
              className="h-full w-full"
              xDataKey="month"
            >
              <EvilAreaChart.Grid />
              <EvilAreaChart.XAxis dataKey="month" />
              <EvilAreaChart.Tooltip />
              <EvilAreaChart.Area dataKey="volume" variant="gradient">
                <EvilAreaChart.ActiveDot variant="colored-border" />
              </EvilAreaChart.Area>
            </EvilAreaChart>
          </div>
        </Panel>

        <Panel title="Shipment status" subtitle="Across every active file">
          <div className="h-56 p-2">
            <EvilRadialChart
              data={statusBreakdown}
              config={statusConfig}
              nameKey="status"
              variant="full"
              className="h-full w-full"
            >
              <EvilRadialChart.Tooltip />
              <EvilRadialChart.RadialBar dataKey="count" />
            </EvilRadialChart>
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title={content.bookTitle} subtitle={content.bookSubtitle}>
          <ul className="divide-y divide-border">
            {orders.map((order) => {
              const isSelected = selected?.id === order.id
              return (
                <li key={order.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(order.id)}
                    aria-pressed={isSelected}
                    className={cn(
                      "w-full cursor-pointer px-5 py-4 text-start outline-none transition-colors hover:bg-muted/40 focus-visible:bg-muted/60",
                      isSelected && "bg-amama-subtle/40"
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-semibold text-foreground">
                        {order.id}
                      </span>
                      <StatusPill status={order.status} />
                      <span className="ms-auto shrink-0 text-[12px] text-muted-foreground">
                        ETA {order.etaDays} days
                      </span>
                    </div>
                    <p className="mt-1.5 text-[14px] text-muted-foreground">
                      {order.crop} — {order.variety} · {order.tonnes} MT · {order.grade} ·{" "}
                      {order.counterparty}
                    </p>
                    <div className="mt-3">
                      <GateBar
                        cleared={order.gatesCleared}
                        total={TOTAL_GATES}
                        status={order.status}
                      />
                    </div>
                    <p className="mt-2 truncate text-[12px] text-muted-foreground">
                      Lots: {order.lots.join(" · ")}
                    </p>
                  </button>
                </li>
              )
            })}
          </ul>
        </Panel>

        <Panel
          title="Lot record"
          subtitle="Everything the QR on the carton opens"
          className="self-start"
        >
          {selected ? (
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-[12px] text-muted-foreground">
                  {selected.lots[0]}
                </span>
                <QrCode aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              </div>
              <ol className="mt-4 flex flex-col gap-3">
                {trace.map((step) => (
                  <TraceStep
                    key={step.stage}
                    stage={step.stage}
                    detail={step.detail}
                    done={step.done}
                  />
                ))}
              </ol>
            </div>
          ) : (
            <p className="px-5 py-6 text-[13px] text-muted-foreground">
              Select a file to open its lot record.
            </p>
          )}
        </Panel>
      </div>

      <p className="mt-4 text-[12px] text-muted-foreground">
        Demo data, derived from your onboarding answers, until the trade API is live.
      </p>
    </div>
  )
}

export { DashboardOverview }
