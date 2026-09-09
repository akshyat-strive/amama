import { BuyerProductView } from "@/features/dashboard/views/buyer-product-view"

export default async function Page({
  params,
}: {
  params: Promise<{ listingId: string }>
}) {
  const { listingId } = await params
  return <BuyerProductView listingId={listingId} />
}
