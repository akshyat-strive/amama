"use client"

import { WalletIcon } from "lucide-react"

import { AdminEmptyState } from "@/features/admin/admin-ui"

/** ponytail: placeholder — payment data already lives on `Deal` in
 *  deal-store.ts (`updatePayment`); this page will roll that up across
 *  deals once it's actually built. */
function FinanceView() {
  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">Finance</h1>
      <AdminEmptyState
        icon={WalletIcon}
        title="Coming soon"
        description="Payments and invoices across every deal will land here."
      />
    </div>
  )
}

export { FinanceView }
