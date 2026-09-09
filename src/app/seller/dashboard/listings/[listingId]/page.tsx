import { SellerProductView } from "@/features/dashboard/views/seller-product-view"

export default async function Page({
  params,
}: {
  params: Promise<{ listingId: string }>
}) {
  const { listingId } = await params
  return <SellerProductView listingId={listingId} />
}
