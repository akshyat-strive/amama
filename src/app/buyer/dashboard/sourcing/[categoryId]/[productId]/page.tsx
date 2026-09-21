import { ProductVariantsView } from "@/features/dashboard/views/product-variants-view"

export default async function Page({
  params,
}: {
  params: Promise<{ categoryId: string; productId: string }>
}) {
  const { categoryId, productId } = await params
  return <ProductVariantsView categoryId={categoryId} productId={productId} />
}
