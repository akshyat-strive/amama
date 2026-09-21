import { ShipmentDetailView } from "@/features/internal/views/shipments-view"

export default async function Page({ params }: { params: Promise<{ shipmentId: string }> }) {
  const { shipmentId } = await params
  return <ShipmentDetailView shipmentId={decodeURIComponent(shipmentId)} />
}
