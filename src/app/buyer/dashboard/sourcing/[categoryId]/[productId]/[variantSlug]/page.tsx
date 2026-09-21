import { VariantSellersView } from "@/features/dashboard/views/variant-sellers-view"

export default async function Page({
  params,
}: {
  params: Promise<{ categoryId: string; productId: string; variantSlug: string }>
}) {
  const { categoryId, productId, variantSlug } = await params
  return <VariantSellersView categoryId={categoryId} productId={productId} variantSlug={variantSlug} />
}
