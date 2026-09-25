"use client"

import * as W from "@/features/tradechain/demo-world"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import { canView, partyIdsFor, tradesFor, type TradePerspective } from "@/features/trades/trade-access"
import { TradeBoard } from "@/features/trades/trade-board"
import { TradeDetail } from "@/features/trades/trade-detail"

const BASE_PATH: Record<TradePerspective, string> = {
  buyer: "/buyer/dashboard/trades",
  seller: "/seller/dashboard/trades",
  internal: "/internal/trade-desk",
}

function useViewerEmail(perspective: TradePerspective): string {
  const { draft } = useOnboarding()
  if (perspective === "buyer") return draft.buyer.email
  if (perspective === "seller") return draft.seller.email
  return ""
}

function TradesPage({ perspective }: { perspective: TradePerspective }) {
  const email = useViewerEmail(perspective)
  return <TradeBoard trades={tradesFor(perspective, email)} perspective={perspective} basePath={BASE_PATH[perspective]} />
}

function TradePage({ perspective, tradeId }: { perspective: TradePerspective; tradeId: string }) {
  const email = useViewerEmail(perspective)
  const trade = canView(perspective, email, tradeId) ? W.tradeById(tradeId) : undefined
  return (
    <TradeDetail
      trade={trade}
      perspective={perspective}
      basePath={BASE_PATH[perspective]}
      partyIds={partyIdsFor(perspective, email)}
    />
  )
}

export { TradePage, TradesPage }
