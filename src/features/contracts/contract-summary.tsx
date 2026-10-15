"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import type { Contract } from "@/features/contracts/contract-store"
import { ContractStepper } from "@/features/contracts/contract-stepper"
import { formatInr } from "@/features/marketplace/currency"
import { IncotermInfoButton } from "@/features/marketplace/incoterm-picker"

function Party({ role, name }: { role: string; name: string }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-[12px] text-muted-foreground">{role}</p>
      <p className="truncate text-[14px] font-semibold text-foreground" title={name}>
        {name}
      </p>
    </div>
  )
}

function Term({ label, value, labelExtra, wide, strong }: { label: string; value: string; labelExtra?: React.ReactNode; wide?: boolean; strong?: boolean }) {
  return (
    <div className={cn("min-w-0", wide && "col-span-2")}>
      <dt className="flex items-center gap-1 text-[12px] text-muted-foreground">
        {label}
        {labelExtra}
      </dt>
      <dd className={cn("mt-0.5 text-[13.5px] font-semibold text-foreground", strong ? "text-[15px] tabular-nums" : "break-words")}>{value}</dd>
    </div>
  )
}

/** Everything about the deal you'd glance back at: who is party to it,
 *  where it stands, and what was agreed. A card of its own on phones (first,
 *  compact), a sticky side column from `lg`. */
function ContractSummary({ contract }: { contract: Contract }) {
  const terms = contract.terms
  return (
    <aside aria-label="Contract summary" className="flex flex-col gap-4 rounded-2xl bg-card p-4 lg:sticky lg:top-0">
      <div>
        <div className="flex items-start gap-3">
          <Party role="Buyer" name={contract.buyerName} />
          <Party role="Seller" name={contract.sellerName} />
        </div>
        <p className="mt-2 text-[12.5px] text-muted-foreground">
          Managed by <span className="font-medium text-foreground">{contract.kamName}</span>
        </p>
      </div>

      <div aria-hidden className="h-px bg-border" />
      <ContractStepper stage={contract.stage} />
      <div aria-hidden className="h-px bg-border" />

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Term label="Price" value={`${formatInr(terms.pricePerTonneUsd)}/t`} />
        <Term label="Quantity" value={`${terms.quantityMt} MT`} />
        <Term label="Total value" value={formatInr(terms.pricePerTonneUsd * terms.quantityMt)} wide strong />
        <Term label="Incoterm" value={terms.incoterm ?? "—"} labelExtra={<IncotermInfoButton />} />
        <Term label="Payment" value={terms.paymentTerm ?? "—"} />
        <Term label="Origin" value={terms.originPort ?? "—"} />
        <Term label="Destination" value={terms.destinationPort ?? "—"} />
        <Term label="Quality" value={terms.qualitySpec ?? "—"} wide />
      </dl>
    </aside>
  )
}

export { ContractSummary }
