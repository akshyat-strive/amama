import { RfqDetailView } from "@/features/internal/views/rfqs-view"

export default async function Page({ params }: { params: Promise<{ rfqId: string }> }) {
  const { rfqId } = await params
  return <RfqDetailView rfqId={decodeURIComponent(rfqId)} />
}
