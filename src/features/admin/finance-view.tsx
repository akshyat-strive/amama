"use client"

import { WalletIcon } from "lucide-react"

import { ColumnCard } from "@/components/ui/column-card"
import { AdminEmptyState } from "@/features/admin/admin-ui"

/** ponytail: placeholder — payment data already lives on `Deal` in
 *  deal-store.ts (`updatePayment`); this page will roll that up across
 *  deals once it's actually built. */
function FinanceView() {
  return (
    <ColumnCard title="Finance">
      <AdminEmptyState
        icon={WalletIcon}
        title="Coming soon"
        description="Payments and invoices across every deal will land here."
      />
    </ColumnCard>
  )
}

export { FinanceView }
