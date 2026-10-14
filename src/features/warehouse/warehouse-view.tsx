"use client"

import * as React from "react"
import { ArrowDownToLineIcon, ArrowUpFromLineIcon, ChevronDownIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { ColumnCard } from "@/components/ui/column-card"
import { useCurrentAdmin } from "@/features/admin/current-admin"
import * as Wd from "@/features/tradechain/demo-world"
import {
  WAREHOUSES,
  markArrived,
  markDispatched,
  recordAmamaQc,
  useInbound,
  useOutbound,
  type Inbound,
} from "@/features/warehouse/warehouse-store"
import { QcCard, VERDICT } from "@/features/warehouse/warehouse-ui"
import dynamic from "next/dynamic"

const FleetMap = dynamic(() => import("@/features/logistics/fleet-map").then((module) => module.FleetMap), {
  ssr: false,
  loading: () => <div className="h-[380px] animate-pulse rounded-[16px] bg-background" />,
})

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en", { day: "numeric", month: "short" }) : "—")

const INBOUND_STATUS: Record<Inbound["status"], { label: string; className: string }> = {
  "in-transit": { label: "In transit", className: "bg-muted text-foreground" },
  arrived: { label: "At dock · QC", className: "bg-status-warning/12 text-status-warning" },
  stored: { label: "Stored", className: "bg-amama-subtle text-amama-deep" },
  rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive" },
}

/**
 * The warehouse desk: what's coming in from growers and going out to the
 * port. One site today (Mumbai) — the selector is already there for the
 * next. Inbound lots carry the grower's farm QC and ours at the dock;
 * Logistics records ours and moves lots into storage.
 */
function WarehouseView() {
  const admin = useCurrentAdmin()
  const inbound = useInbound()
  const outbound = useOutbound()
  const [warehouseId, setWarehouseId] = React.useState(WAREHOUSES[0].id)
  const [tab, setTab] = React.useState<"inbound" | "outbound">("inbound")
  const [filter, setFilter] = React.useState<"all" | Inbound["status"]>("all")
  const [openId, setOpenId] = React.useState<string | null>(null)
  if (!admin) return null

  const canAct = admin.can("logistics.manage")
  const warehouse = WAREHOUSES.find((entry) => entry.id === warehouseId)!
  const inHere = inbound.filter((row) => row.warehouseId === warehouseId)
  const outHere = outbound.filter((row) => row.warehouseId === warehouseId)
  const stored = inHere.filter((row) => row.status === "stored").reduce((sum, row) => sum + (row.receivedMt ?? 0), 0)
  const dispatched = outHere.filter((row) => row.status === "dispatched").reduce((sum, row) => sum + row.qtyMt, 0)
  const onHand = Math.max(0, stored - dispatched)
  const atDock = inHere.filter((row) => row.status === "arrived").length
  const inTransit = inHere.filter((row) => row.status === "in-transit").length
  const shown = filter === "all" ? inHere : inHere.filter((row) => row.status === filter)

  return (
    <ColumnCard
      title="Warehouse"
      action={
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden min-w-0 truncate text-[13px] text-muted-foreground md:block">{warehouse.address}</span>
          <select
            value={warehouseId}
            onChange={(event) => setWarehouseId(event.target.value)}
            aria-label="Warehouse"
            title={warehouse.address}
            className="h-9 shrink-0 rounded-xl bg-card px-3 text-[13.5px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-amama-deep/30"
          >
            {WAREHOUSES.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[
          { label: "On hand", value: `${onHand.toFixed(0)} MT`, caption: `${Math.round((onHand / warehouse.capacityMt) * 100)}% of ${warehouse.capacityMt} MT` },
          { label: "At the dock", value: String(atDock), caption: "Lots waiting on our QC" },
          { label: "In transit", value: String(inTransit), caption: "Trucks on the way in" },
          { label: "Dispatched", value: `${dispatched} MT`, caption: `${outHere.filter((row) => row.status !== "dispatched").length} containers scheduled` },
        ].map((tile) => (
          <div key={tile.label} className="rounded-[20px] bg-card p-2">
            <p className="px-2 pt-1 pb-2 text-[13px] font-medium text-foreground/80">{tile.label}</p>
            <div className="rounded-[14px] bg-background px-3.5 py-3">
              <p className="text-[26px] font-semibold tracking-[-0.025em] tabular-nums">{tile.value}</p>
              <p className="text-[12.5px] text-muted-foreground">{tile.caption}</p>
            </div>
          </div>
        ))}
      </div>

      <section aria-label="Inbound trucks" className="mt-2 rounded-[24px] bg-card p-2">
        <header className="flex flex-wrap items-baseline justify-between gap-2 px-3 pt-2 pb-3">
          <h2 className="text-[17px] font-semibold tracking-[-0.02em]">Trucks on the way</h2>
          <p className="text-[13px] text-muted-foreground">Road routes from each farm to {warehouse.city}</p>
        </header>
        <FleetMap
          warehouse={{ name: warehouse.name, gps: warehouse.gps }}
          trucks={inHere
            .filter((row) => row.status === "in-transit")
            .map((row, index) => {
              const seller = Wd.sellerById(row.sellerId)
              return {
                id: row.id,
                label: `${row.vehicle} · ${seller?.entity ?? row.sellerId}`,
                detail: `${row.lot} · ${row.expectedMt} MT · ETA ${when(row.eta)}`,
                from: seller?.gps ?? warehouse.gps,
                progress: 0.25 + ((index * 17) % 50) / 100,
              }
            })}
        />
      </section>

      <div className="mt-5 flex flex-wrap items-center gap-3 px-1.5">
        <ButtonGroup
          label="Direction"
          value={tab}
          onChange={setTab}
          options={[
            { value: "inbound", label: `Inbound · ${inHere.length}`, icon: ArrowDownToLineIcon },
            { value: "outbound", label: `Outbound · ${outHere.length}`, icon: ArrowUpFromLineIcon },
          ]}
        />
        {tab === "inbound" ? (
          <ButtonGroup
            label="Status"
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All" },
              { value: "in-transit", label: "In transit" },
              { value: "arrived", label: "At dock" },
              { value: "stored", label: "Stored" },
              { value: "rejected", label: "Rejected" },
            ]}
          />
        ) : null}
      </div>

      {tab === "inbound" ? (
        <ul className="mt-3">
          {shown.map((row) => {
            const open = openId === row.id
            const seller = Wd.sellerById(row.sellerId)
            const product = Wd.productById(row.productId)
            const status = INBOUND_STATUS[row.status]
            const verdict = VERDICT[row.amamaQc.verdict]
            return (
              <li key={row.id}>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : row.id)}
                  className="chat-row grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 rounded-xl px-3 py-3 text-start transition-colors [--row-inset:0.75rem] hover:bg-card sm:grid-cols-[8rem_minmax(0,1.3fr)_minmax(0,1fr)_6rem_8rem_1rem]"
                >
                  <span className="hidden font-mono text-[12px] text-muted-foreground sm:block">{row.grn ?? row.lot}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-semibold">{seller?.entity ?? row.sellerId}</span>
                    <span className="block truncate text-[12.5px] text-muted-foreground">
                      {product?.label ?? row.productId} · {row.lot} · {seller?.district}, {seller?.state}
                    </span>
                  </span>
                  <span className="hidden text-[12.5px] text-muted-foreground sm:block">
                    {row.vehicle} · ETA {when(row.eta)}
                  </span>
                  <span className="hidden text-[13px] font-medium tabular-nums sm:block">{row.receivedMt ?? row.expectedMt} MT</span>
                  <span className="flex flex-col items-end gap-1 sm:items-start">
                    <span className={cn("rounded-lg px-2 py-0.5 text-[12px] font-semibold", status.className)}>{status.label}</span>
                    {row.status !== "in-transit" ? <span className={cn("rounded-lg px-2 py-0.5 text-[11px] font-medium", verdict.className)}>QC {verdict.label.toLowerCase()}</span> : null}
                  </span>
                  <ChevronDownIcon aria-hidden className={cn("hidden size-4 text-muted-foreground transition-transform sm:block", open && "rotate-180")} />
                </button>
                {open ? (
                  <div className="mb-2 flex flex-col gap-2 rounded-[16px] bg-card p-2">
                    <div className="grid gap-2 md:grid-cols-2">
                      <QcCard title={`Farm QC · ${seller?.entity ?? "Grower"}`} report={row.farmQc} />
                      <QcCard title={`amama QC · ${warehouse.city}`} report={row.amamaQc} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 px-1 text-[12.5px] text-muted-foreground">
                      <span className="me-auto">
                        Trade {row.tradeId}
                        {row.bay ? ` · bay ${row.bay}` : ""}
                        {row.arrivedAt ? ` · arrived ${when(row.arrivedAt)}` : ""}
                      </span>
                      {canAct && row.status === "in-transit" ? (
                        <Button size="sm" variant="outline" onClick={() => markArrived(row.id)}>
                          Mark arrived
                        </Button>
                      ) : null}
                      {canAct && row.status === "arrived" ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => recordAmamaQc(row.id, "hold", admin.user.name, null)}>
                            Hold
                          </Button>
                          <Button size="sm" variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-white" onClick={() => recordAmamaQc(row.id, "rejected", admin.user.name, null)}>
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              recordAmamaQc(row.id, "passed", admin.user.name, null)
                              toast.success(`${row.lot} passed QC and moved to storage`)
                            }}
                          >
                            Pass QC & store
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </li>
            )
          })}
          {shown.length === 0 ? <li className="px-4 py-10 text-center text-[14px] text-muted-foreground">Nothing here.</li> : null}
        </ul>
      ) : (
        <ul className="mt-3">
          {outHere.map((row) => {
            const buyer = Wd.buyerById(row.buyerId)
            const product = Wd.productById(row.productId)
            return (
              <li key={row.id} className="chat-row grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-3 py-3 [--row-inset:0.75rem] sm:grid-cols-[9rem_minmax(0,1.3fr)_minmax(0,1fr)_5rem_auto]">
                <span className="hidden font-mono text-[12px] text-muted-foreground sm:block">{row.container}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold">{buyer?.company ?? row.buyerId}</span>
                  <span className="block truncate text-[12.5px] text-muted-foreground">
                    {product?.label ?? row.productId} · Trade {row.tradeId}
                  </span>
                </span>
                <span className="hidden text-[12.5px] text-muted-foreground sm:block">
                  → {row.port} · {when(row.dispatchedAt ?? row.scheduledAt)}
                </span>
                <span className="hidden text-[13px] font-medium tabular-nums sm:block">{row.qtyMt} MT</span>
                <span className="flex items-center justify-end gap-2">
                  <span
                    className={cn(
                      "rounded-lg px-2 py-0.5 text-[12px] font-semibold",
                      row.status === "dispatched" ? "bg-amama-subtle text-amama-deep" : row.status === "loading" ? "bg-status-warning/12 text-status-warning" : "bg-muted text-foreground"
                    )}
                  >
                    {row.status === "dispatched" ? "Dispatched" : row.status === "loading" ? "Loading" : "Scheduled"}
                  </span>
                  {canAct && row.status !== "dispatched" ? (
                    <Button size="sm" variant="outline" onClick={() => markDispatched(row.id)}>
                      Dispatch
                    </Button>
                  ) : null}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </ColumnCard>
  )
}

export { WarehouseView }
