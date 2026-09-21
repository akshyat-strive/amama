"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowRightIcon, ShipIcon, ThermometerIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetCloseButton } from "@/components/ui/sheet"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import { sellerIdentity } from "@/features/marketplace/identity"
import {
  addShipmentEvent,
  addTemperatureSample,
  LOGISTICS_STAGE_LABELS,
  LOGISTICS_STAGE_OWNER,
  useDeals,
  type Deal,
  type Shipment,
} from "@/features/marketplace/deal-store"
import { ShipmentTracker, ShipmentRow } from "@/features/marketplace/shipment-tracker"

type SellerShipmentsTab = "dispatch" | "tracked"

/** One row per shipment that's genuinely the seller's own to move forward
 *  right now — everything before a container is booked. Farm pickup,
 *  warehouse inbound and cold storage/export QC never had a screen at all
 *  before this; a seller could see a shipment existed but had no way to
 *  actually advance it themselves. */
const NEXT_STEP: Partial<
  Record<
    Shipment["stage"],
    { label: string; type: "warehouse-inbound" | "cold-storage-in" | "export-qc-pass"; entersStage: Shipment["stage"] }
  >
> = {
  "farm-pickup": { label: "Confirm arrived at warehouse", type: "warehouse-inbound", entersStage: "warehouse-inbound" },
  "warehouse-inbound": { label: "Move into cold storage", type: "cold-storage-in", entersStage: "cold-storage" },
  "cold-storage": { label: "Confirm export QC passed", type: "export-qc-pass", entersStage: "packing-export-qc" },
}

function DispatchChecklist({ deal, shipment }: { deal: Deal; shipment: Shipment }) {
  const [logging, setLogging] = React.useState(false)
  const [tempC, setTempC] = React.useState("")
  const next = NEXT_STEP[shipment.stage]

  const advance = () => {
    if (!next) return
    addShipmentEvent(deal.id, shipment.id, {
      type: next.type,
      label: LOGISTICS_STAGE_LABELS[next.entersStage],
      location: shipment.currentLocation,
      note: null,
    })
  }

  const logTemperature = () => {
    const value = Number(tempC)
    if (!Number.isFinite(value)) return
    addTemperatureSample(deal.id, shipment.id, { tempC: value, leg: "cold-store" })
    setTempC("")
    setLogging(false)
  }

  return (
    <div className="grid w-full grid-cols-1 items-center gap-3 border-b border-slate-100 bg-white px-4 py-3.5 text-start transition-colors hover:bg-slate-50/80 sm:grid-cols-[1.6fr_1fr_auto]">
      {/* Col 1: Listing & Buyer Info */}
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="shrink-0 rounded-full bg-amama-subtle px-2 py-0.5 text-[11px] font-semibold text-amama-deep">
            Yours to move
          </span>
          <p className="truncate text-[14px] font-bold text-slate-900">
            {deal.listingTitle}
          </p>
        </div>
        <p className="text-[12px] text-slate-500">
          {LOGISTICS_STAGE_LABELS[shipment.stage]} · <span className="font-medium text-slate-700">{deal.buyerName}</span>
        </p>
      </div>

      {/* Col 2: Context / Inline Temp Input when active */}
      <div className="flex min-w-0 items-center text-[12px] text-slate-500">
        {shipment.stage === "cold-storage" && logging ? (
          <div className="flex w-full items-center gap-1.5 sm:w-auto">
            <div className="relative w-24">
              <Input
                type="number"
                placeholder="-18"
                value={tempC}
                onChange={(e) => setTempC(e.target.value)}
                className="h-7 border-slate-200 bg-white pr-6 text-xs tabular-nums"
                autoFocus
              />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
                °C
              </span>
            </div>
            <button
              type="button"
              onClick={logTemperature}
              className="inline-flex h-7 items-center rounded bg-slate-900 px-2.5 text-xs font-medium text-white hover:bg-slate-800"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setLogging(false)}
              className="px-1 text-xs text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>
        ) : (
          <span className="truncate text-slate-400 text-[11px]">
            {shipment.stage === "cold-storage" ? "Cold store monitored" : "—"}
          </span>
        )}
      </div>

      {/* Col 3: Actionables (Icon + Minimal label) */}
      <div className="flex items-center justify-end gap-2 tabular-nums">
        {shipment.stage === "cold-storage" && !logging && (
          <button
            type="button"
            onClick={() => setLogging(true)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <ThermometerIcon className="size-3.5 text-amama-deep" />
            <span>Temp</span>
          </button>
        )}

        {next ? (
          <button
            type="button"
            onClick={advance}
            className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
          >
            <span>{next.label}</span>
            <ArrowRightIcon className="size-3 text-slate-400" />
          </button>
        ) : (
          <span className="text-[11px] text-slate-400">Waiting KAM booking</span>
        )}
      </div>
    </div>
  )
}

/** The tracker's own detail, opened from a list row rather than shown
 *  inline — a bottom sheet on a phone, a side sheet from `sm` up. Carries
 *  the one action that's actually a seller's to take from here (the same
 *  next-step `DispatchChecklist` already offers), when the shipment's
 *  still at a seller-owned stage; the temperature-logging sub-flow stays
 *  on the Dispatch tab's own checklist card rather than duplicated here. */
function ShipmentDetailSheet({
  pair,
  onOpenChange,
}: {
  pair: { deal: Deal; shipment: Shipment } | null
  onOpenChange: (open: boolean) => void
}) {
  const next = pair ? NEXT_STEP[pair.shipment.stage] : undefined
  const isSellersToMove = pair ? LOGISTICS_STAGE_OWNER[pair.shipment.stage] === "seller" : false

  const advance = () => {
    if (!pair || !next) return
    addShipmentEvent(pair.deal.id, pair.shipment.id, {
      type: next.type,
      label: LOGISTICS_STAGE_LABELS[next.entersStage],
      location: pair.shipment.currentLocation,
      note: null,
    })
  }

  return (
    <Sheet open={pair !== null} onOpenChange={onOpenChange}>
      <SheetContent side="responsive" className="overflow-y-auto">
        {/* <SheetCloseButton /> */}
        {pair ? (
          <ShipmentTracker
            shipment={pair.shipment}
            actions={
              isSellersToMove && next ? (
                <Button size="sm" onClick={advance}>
                  {next.label}
                </Button>
              ) : undefined
            }
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function ShipmentsTabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors",
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label} <span className={cn("tabular-nums", active ? "text-muted-foreground" : "text-muted-foreground/70")}>{count}</span>
    </button>
  )
}

/** `useSearchParams` opts a route out of static rendering unless it sits
 *  under a boundary — same fix already applied elsewhere in this app. */
function SellerShipmentsView() {
  return (
    <React.Suspense fallback={<ShipmentsSkeleton />}>
      <SellerShipmentsWorkspace />
    </React.Suspense>
  )
}

function ShipmentsSkeleton() {
  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">Shipments</h1>
      <div className="mt-6 h-40 animate-pulse rounded-3xl bg-muted" />
    </div>
  )
}

/** Sellers had no Shipments page at all before this — buyers' existing
 *  synthetic demo content had nothing seller-shaped to mirror, so this is
 *  just the real tracker half of that page, not a full synthetic rebuild.
 *  Tabbed (`?tab=dispatch|tracked`) rather than two stacked sections: what's
 *  genuinely the seller's own to advance right now (farm pickup through
 *  export QC) reads as its own checklist, and everything else is a plain
 *  divider-separated list, each row opening the full tracker in a sheet
 *  (`?shipment=`) rather than rendering full-detail cards stacked in a
 *  column. */
function SellerShipmentsWorkspace() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { draft } = useOnboarding()
  const deals = useDeals()

  const myId = sellerIdentity(draft.seller).id
  const myDeals = React.useMemo(() => deals.filter((deal) => deal.sellerId === myId), [deals, myId])
  const trackedShipments = React.useMemo(
    () => myDeals.flatMap((deal) => deal.shipments.map((shipment) => ({ deal, shipment }))),
    [myDeals]
  )

  const dispatchQueue = trackedShipments.filter(({ shipment }) => LOGISTICS_STAGE_OWNER[shipment.stage] === "seller")

  const tab: SellerShipmentsTab = searchParams.get("tab") === "tracked" ? "tracked" : "dispatch"
  const selectedId = searchParams.get("shipment")
  const selectedPair = trackedShipments.find(({ shipment }) => shipment.id === selectedId) ?? null

  const setParams = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(next)) {
      if (value === null) params.delete(key)
      else params.set(key, value)
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const setTab = (next: SellerShipmentsTab) => setParams({ tab: next === "dispatch" ? null : next, shipment: null })
  const openShipment = (id: string) => setParams({ shipment: id })
  const closeSheet = () => setParams({ shipment: null })

  if (trackedShipments.length === 0) {
    return (
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">Shipments</h1>
        <div className="mt-6 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border px-5 py-16 text-center">
          <ShipIcon aria-hidden className="size-6 text-muted-foreground" />
          <p className="text-[15px] font-semibold">No shipments yet</p>
          <p className="max-w-sm text-[13px] text-muted-foreground">
            Once a deal of yours reaches shipping and a shipment is booked, it&apos;ll show up here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">Shipments</h1>

      <div role="tablist" aria-label="Shipment lists" className="mt-5 flex w-fit gap-1 rounded-full bg-muted p-1">
        <ShipmentsTabButton
          label="Dispatch & cold chain"
          count={dispatchQueue.length}
          active={tab === "dispatch"}
          onClick={() => setTab("dispatch")}
        />
        <ShipmentsTabButton
          label="Tracked shipments"
          count={trackedShipments.length}
          active={tab === "tracked"}
          onClick={() => setTab("tracked")}
        />
      </div>

      {tab === "dispatch" ? (
        dispatchQueue.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-border px-5 py-10 text-center text-[13px] text-muted-foreground">
            Nothing needs your attention right now — every tracked shipment&apos;s already past your own leg of it.
          </p>
        ) : (
          <div className="mt-4 flex flex-col divide-y divide-border rounded-2xl border border-border bg-card overflow-hidden">
            {dispatchQueue.map(({ deal, shipment }) => (
              <DispatchChecklist key={shipment.id} deal={deal} shipment={shipment} />
            ))}
          </div>
        )
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-border rounded-2xl border border-border bg-card overflow-hidden">
          {trackedShipments.map(({ shipment }) => (
            <li key={shipment.id}>
              <ShipmentRow shipment={shipment} onSelect={() => openShipment(shipment.id)} />
            </li>
          ))}
        </ul>
      )}

      <ShipmentDetailSheet pair={selectedPair} onOpenChange={(open) => !open && closeSheet()} />
    </div>
  )
}

export { SellerShipmentsView }
