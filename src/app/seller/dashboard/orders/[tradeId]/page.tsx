import { SellerOrderPage } from "@/features/orders/seller-orders"

export default async function Page({ params }: { params: Promise<{ tradeId: string }> }) {
  const { tradeId } = await params
  return <SellerOrderPage tradeId={decodeURIComponent(tradeId)} />
}
