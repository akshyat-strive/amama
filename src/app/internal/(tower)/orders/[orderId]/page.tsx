import { OrderDetailView } from "@/features/internal/views/orders-view"

export default async function Page({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params
  return <OrderDetailView orderId={decodeURIComponent(orderId)} />
}
