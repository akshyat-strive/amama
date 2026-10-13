"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { PackageIcon, ShipIcon, WaypointsIcon } from "lucide-react"

import { ButtonGroup } from "@/components/ui/button-group"
import { OrdersView } from "@/features/dashboard/views/orders-view"
import { SellerShipmentsView } from "@/features/dashboard/views/seller-shipments-view"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import * as Wd from "@/features/tradechain/demo-world"
import { partyIdsFor } from "@/features/trades/trade-access"
import { TradePage, TradesPage } from "@/features/trades/trade-pages"
import { useInbound, WAREHOUSES } from "@/features/warehouse/warehouse-store"
import { FarmToWarehouseMap, QcCard } from "@/features/warehouse/warehouse-ui"

type View = "orders" | "shipments" | "consignments"

/**
 * A seller's one place for everything they've sold: the orders
 * themselves, their shipments, and the consignment book — what used to
 * be three sidebar items. Each order opens at /seller/dashboard/orders/[id].
 */
function SellerOrdersPage() {
  return (
    <React.Suspense fallback={null}>
      <SellerOrdersInner />
    </React.Suspense>
  )
}

function SellerOrdersInner() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const view = (["shipments", "consignments"].includes(searchParams.get("view") ?? "") ? searchParams.get("view") : "orders") as View

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="me-auto text-[34px] font-semibold tracking-[-0.03em]">Orders</h1>
        <ButtonGroup
          label="Show"
          value={view}
          onChange={(next) => router.replace(next === "orders" ? pathname : `${pathname}?view=${next}`, { scroll: false })}
          options={[
            { value: "orders", label: "Orders", icon: WaypointsIcon },
            { value: "shipments", label: "Shipments", icon: ShipIcon },
            { value: "consignments", label: "Consignments", icon: PackageIcon },
          ]}
        />
      </div>
      {/* Each view brings its own title; the page's own is enough here. */}
      <div className="mt-5 [&_h1]:hidden">
        {view === "orders" ? <TradesPage perspective="seller" /> : view === "shipments" ? <SellerShipmentsView /> : <OrdersView role="seller" />}
      </div>
    </div>
  )
}

/** One order: the trade itself, then the first mile — farm to the Mumbai
 *  warehouse on a map — and each lot's QC, the grower's and ours. */
function SellerOrderPage({ tradeId }: { tradeId: string }) {
  const { draft } = useOnboarding()
  const inbound = useInbound()
  const trade = Wd.tradeById(tradeId)
  const parties = partyIdsFor("seller", draft.seller.email)
  const sellerId = trade?.sellerIds.find((id) => parties.includes(id)) ?? trade?.sellerIds[0]
  const seller = sellerId ? Wd.sellerById(sellerId) : undefined
  const lots = inbound.filter((row) => row.tradeId === tradeId && (!sellerId || row.sellerId === sellerId))
  const warehouse = WAREHOUSES[0]
  const progress = lots.length === 0 ? 0 : lots.some((row) => row.status === "in-transit") ? (lots.every((row) => row.status === "in-transit") ? 0.45 : 0.8) : 1

  return (
    <div className="flex flex-col gap-6">
      <TradePage perspective="seller" tradeId={tradeId} />

      {trade && seller ? (
        <>
          <FarmToWarehouseMap
            farm={{ name: seller.entity, place: `${seller.village}, ${seller.district}, ${seller.state}`, gps: seller.gps }}
            warehouse={warehouse}
            progress={progress}
          />

          <section aria-label="Quality checks" className="rounded-[24px] bg-card p-2">
            <header className="px-3 pt-2 pb-3">
              <h2 className="text-[17px] font-semibold tracking-[-0.02em]">Quality checks</h2>
              <p className="text-[13px] text-muted-foreground">Your QC at the farm, and ours when each lot reaches {warehouse.city}.</p>
            </header>
            {lots.length === 0 ? (
              <p className="rounded-[16px] bg-background px-4 py-8 text-center text-[14px] text-muted-foreground">No lots have left the farm yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {lots.map((lot) => (
                  <li key={lot.id} className="rounded-[18px] bg-muted/60 p-2">
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2 pt-1 pb-2 text-[13px]">
                      <span className="font-mono font-semibold">{lot.lot}</span>
                      <span className="text-muted-foreground">
                        {lot.receivedMt ?? lot.expectedMt} MT · {lot.vehicle}
                        {lot.grn ? ` · ${lot.grn}` : ""}
                        {lot.bay ? ` · bay ${lot.bay}` : ""}
                      </span>
                    </p>
                    <div className="grid gap-2 md:grid-cols-2">
                      <QcCard title="Farm QC" report={lot.farmQc} />
                      <QcCard title={`amama QC · ${warehouse.city}`} report={lot.amamaQc} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}

export { SellerOrdersPage, SellerOrderPage }
