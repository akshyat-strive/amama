import { BuyerOrderPage } from "@/features/orders/buyer-orders-view"

export default async function Page({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params
  return <BuyerOrderPage orderId={decodeURIComponent(orderId)} />
}
