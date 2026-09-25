import { TradePage } from "@/features/trades/trade-pages"

export default async function Page({ params }: { params: Promise<{ tradeId: string }> }) {
  const { tradeId } = await params
  return <TradePage perspective="buyer" tradeId={decodeURIComponent(tradeId)} />
}
