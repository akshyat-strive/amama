"use client"

import Link from "next/link"
import { ChevronRightIcon, FileSignatureIcon } from "lucide-react"

import { CONTRACT_STAGE_LABELS, CONTRACT_STAGE_ORDER, contractRequirements, useContracts } from "@/features/contracts/contract-store"
import { latestDealForConversation, useDeals } from "@/features/marketplace/deal-store"

/**
 * Once a KAM is working the contract, it floats at the top of the chat as
 * a compact card — where it stands, how much of what was asked has been
 * approved, and a way in — while the conversation carries on below. It
 * pins until the deal falls through.
 */
function ContractStickyBar({ conversationId, viewer }: { conversationId: string; viewer: string }) {
  const deals = useDeals()
  const contracts = useContracts()
  const deal = latestDealForConversation(deals, conversationId)
  const contract = contracts.find((entry) => entry.conversationId === conversationId) ?? null
  if (!deal || deal.status === "declined" || (!deal.contractRequestedAt && !contract)) return null
  const base = viewer === "kam" ? "/internal/contracts" : `/${viewer}/dashboard/contracts`
  const href = contract ? `${base}/${contract.id}` : base

  const step = contract ? CONTRACT_STAGE_ORDER.indexOf(contract.stage) + 1 : 0
  const requirements = contract ? contractRequirements(contract) : { total: 0, approved: 0 }
  // The bar fills with the stage, so it reads as "how far along".
  const progress = contract ? step / CONTRACT_STAGE_ORDER.length : 0

  return (
    <div className="sticky top-0 z-10 shrink-0 px-3 pt-2 pb-1">
      <Link href={href} className="group block rounded-2xl bg-card px-3.5 py-2.5 transition-colors hover:bg-muted/70">
        <div className="flex items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-background text-foreground/80">
            <FileSignatureIcon aria-hidden className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-semibold">{contract ? CONTRACT_STAGE_LABELS[contract.stage] : "Contract requested"}</span>
            <span className="block truncate text-[12px] text-muted-foreground">
              {contract
                ? `${contract.kamName || "Your account manager"} · step ${step} of ${CONTRACT_STAGE_ORDER.length}${requirements.total > 0 ? ` · ${requirements.approved}/${requirements.total} approved` : ""}`
                : "Waiting for an account manager to pick it up"}
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-0.5 text-[13px] font-medium text-foreground">
            Open
            <ChevronRightIcon aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
        {contract ? (
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-background">
            <div className="h-full rounded-full bg-amama-deep transition-[width] duration-500" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        ) : null}
      </Link>
    </div>
  )
}

export { ContractStickyBar }
