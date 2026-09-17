"use client"

import { ShipIcon } from "lucide-react"

import { AdminEmptyState } from "@/features/admin/admin-ui"

/** ponytail: placeholder — shipment data already lives on `Deal` in
 *  deal-store.ts (`ShipmentTracker`); this page will roll that up across
 *  deals once it's actually built. */
function LogisticsView() {
  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">Logistics</h1>
      <AdminEmptyState
        icon={ShipIcon}
        title="Coming soon"
        description="Shipment tracking across every deal will land here."
      />
    </div>
  )
}

export { LogisticsView }
