import * as W from "@/features/tradechain/demo-world"

type TradePerspective = "buyer" | "seller" | "internal"

/**
 * Which trades each demo account is party to. The trade book is one shared
 * world; a buyer account stands in for one or more of its importing
 * companies, a seller account for one or more of its grower entities.
 * Any account not listed falls back to the default portfolio so a freshly
 * onboarded demo user still lands on a populated screen.
 */
const BUYER_PORTFOLIO: Record<string, string[]> = {
  "buyer@amama.in": ["b-alnoor", "b-gulfstar"],
}
const DEFAULT_BUYER_PORTFOLIO = ["b-alnoor", "b-gulfstar"]

const SELLER_PORTFOLIO: Record<string, string[]> = {
  "seller@amama.in": ["s-krishna", "s-tilak"],
  "kashmir@amama.in": ["s-tilak", "s-suresh", "s-pushpa", "s-mahesh"],
}
const DEFAULT_SELLER_PORTFOLIO = ["s-krishna", "s-tilak"]

function partyIdsFor(perspective: TradePerspective, email: string): string[] {
  const key = email.trim().toLowerCase()
  if (perspective === "buyer") return BUYER_PORTFOLIO[key] ?? DEFAULT_BUYER_PORTFOLIO
  if (perspective === "seller") return SELLER_PORTFOLIO[key] ?? DEFAULT_SELLER_PORTFOLIO
  return []
}

function tradesFor(perspective: TradePerspective, email: string): W.Trade[] {
  if (perspective === "internal") return W.TRADES
  const parties = partyIdsFor(perspective, email)
  return W.TRADES.filter((trade) =>
    perspective === "buyer"
      ? parties.includes(trade.buyerId)
      : trade.sellerIds.some((sellerId) => parties.includes(sellerId))
  )
}

function canView(perspective: TradePerspective, email: string, tradeId: string): boolean {
  return tradesFor(perspective, email).some((trade) => trade.id === tradeId)
}

export { canView, partyIdsFor, tradesFor }
export type { TradePerspective }
