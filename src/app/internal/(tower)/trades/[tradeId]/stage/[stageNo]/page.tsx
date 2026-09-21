import { StageDetailView } from "@/features/internal/views/trades-view"

export default async function Page({
  params,
}: {
  params: Promise<{ tradeId: string; stageNo: string }>
}) {
  const { tradeId, stageNo } = await params
  return <StageDetailView tradeId={decodeURIComponent(tradeId)} stageNo={Number(stageNo)} />
}
