"use client"

import { FileSignatureIcon } from "lucide-react"

import { AdminEmptyState } from "@/features/admin/admin-ui"
import { useCurrentAdmin } from "@/features/admin/current-admin"
import { ContractsView } from "@/features/contracts/contracts-view"

/** The console's front door to contracts. Gated on the same permission as
 *  working a deal — drafting the paperwork is part of working it, not a
 *  separate job with its own grant. */
function AdminContractsView() {
  const admin = useCurrentAdmin()
  if (!admin) return null

  if (!admin.can("deals.work")) {
    return (
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">Contracts</h1>
        <div className="mt-6">
          <AdminEmptyState
            icon={FileSignatureIcon}
            title="No contract permissions on your role"
            description="Contracts are drafted by whoever works the deal."
          />
        </div>
      </div>
    )
  }

  return <ContractsView viewer="kam" identity={{ id: admin.user.id, name: admin.user.name }} />
}

export { AdminContractsView }
