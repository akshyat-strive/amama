"use client"

import Link from "next/link"
import { ChevronRightIcon, FileSignatureIcon } from "lucide-react"

import { CONTRACT_STAGE_ORDER, useContracts } from "@/features/contracts/contract-store"
import { latestDealForConversation, useDeals } from "@/features/marketplace/deal-store"

const STAGE_LABEL: Record<string, string> = {
  summary: "Summary",
  "term-sheet": "Term sheet",
  draft: "Draft",
  review: "Review",
  amendments: "Amendments",
  signatures: "Signatures",
  final: "Signed",
}

/**
 * Once either side asks for KAM help turning the deal into a contract,
 * the contract is what this conversation is about — so it pins to the top
 * of the thread, with where it stands and a way in, until the deal falls
 * through.
 */
function ContractStickyBar({ conversationId, viewer }: { conversationId: string; viewer: string }) {
  const deals = useDeals()
  const contracts = useContracts()
  const deal = latestDealForConversation(deals, conversationId)
  if (!deal || deal.status === "declined" || !deal.contractRequestedAt) return null
  const contract = contracts.find((entry) => entry.conversationId === conversationId) ?? null
  const base = viewer === "kam" ? "/internal/contracts" : `/${viewer}/dashboard/contracts`
  const href = contract ? `${base}/${contract.id}` : base
  const step = contract ? CONTRACT_STAGE_ORDER.indexOf(contract.stage) + 1 : 0

  return (
    <div className="sticky top-0 z-10 shrink-0 border-b border-border bg-background/95 px-3 py-2 backdrop-blur">
      <Link href={href} className="flex items-center gap-3 rounded-xl bg-amama px-3 py-2 text-white transition-colors hover:bg-amama-hover">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/15 text-sun">
          <FileSignatureIcon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-semibold">{contract ? `Contract · ${STAGE_LABEL[contract.stage] ?? contract.stage}` : "Contract requested"}</span>
          <span className="block truncate text-[12px] text-white/75">
            {contract ? `Step ${step} of ${CONTRACT_STAGE_ORDER.length} · ${contract.kamName || "Your account manager"}` : "Waiting for an account manager to pick it up"}
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-lg bg-sun px-2.5 py-1 text-[12.5px] font-semibold text-sun-foreground">
          {contract ? "Open" : "View"}
          <ChevronRightIcon className="size-3.5" />
        </span>
      </Link>
    </div>
  )
}

export { ContractStickyBar }
