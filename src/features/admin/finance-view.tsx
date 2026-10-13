"use client"

import { WalletIcon } from "lucide-react"

import { AdminEmptyState } from "@/features/admin/admin-ui"

/** ponytail: placeholder — payment data already lives on `Deal` in
 *  deal-store.ts (`updatePayment`); this page will roll that up across
 *  deals once it's actually built. */
function FinanceView() {
  return (
    <div>
      <h1 className="text-[34px] font-semibold tracking-[-0.03em]">Finance</h1>
      <AdminEmptyState
        icon={WalletIcon}
        title="Coming soon"
        description="Payments and invoices across every deal will land here."
      />
    </div>
  )
}

export { FinanceView }
