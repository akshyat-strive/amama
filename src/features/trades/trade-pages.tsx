"use client"

import type * as React from "react"

import * as W from "@/features/tradechain/demo-world"
import { useLiveWorld } from "@/features/tradechain/live-world"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import { canView, partyIdsFor, tradesFor, type TradePerspective } from "@/features/trades/trade-access"
import { TradeBoard } from "@/features/trades/trade-board"
import { TradeDetail } from "@/features/trades/trade-detail"

const BASE_PATH: Record<TradePerspective, string> = {
  buyer: "/buyer/dashboard/trades",
  seller: "/seller/dashboard/orders",
  internal: "/internal/trade-desk",
}

function useViewerEmail(perspective: TradePerspective): string {
  const { draft } = useOnboarding()
  if (perspective === "buyer") return draft.buyer.email
  if (perspective === "seller") return draft.seller.email
  return ""
}

/** `title` and `action` go in the list card's header — a seller's page
 *  is "Orders", with its view switch beside it. */
function TradesPage({ perspective, title, action }: { perspective: TradePerspective; title?: string; action?: React.ReactNode }) {
  useLiveWorld()
  const email = useViewerEmail(perspective)
  return (
    <TradeBoard
      trades={tradesFor(perspective, email)}
      perspective={perspective}
      basePath={BASE_PATH[perspective]}
      title={title}
      action={action}
    />
  )
}

/** `children` render inside the trade's card, below its sections. */
function TradePage({ perspective, tradeId, children }: { perspective: TradePerspective; tradeId: string; children?: React.ReactNode }) {
  useLiveWorld()
  const email = useViewerEmail(perspective)
  const trade = canView(perspective, email, tradeId) ? W.tradeById(tradeId) : undefined
  return (
    <TradeDetail
      trade={trade}
      perspective={perspective}
      basePath={BASE_PATH[perspective]}
      partyIds={partyIdsFor(perspective, email)}
    >
      {children}
    </TradeDetail>
  )
}

export { TradePage, TradesPage }
