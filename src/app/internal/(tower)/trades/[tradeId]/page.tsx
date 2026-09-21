import { TradeDetailView } from "@/features/internal/views/trades-view"

export default async function Page({ params }: { params: Promise<{ tradeId: string }> }) {
  const { tradeId } = await params
  return <TradeDetailView tradeId={decodeURIComponent(tradeId)} />
}
