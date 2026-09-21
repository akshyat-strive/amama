import { CategoryProductsView } from "@/features/dashboard/views/category-products-view"

export default async function Page({
  params,
}: {
  params: Promise<{ categoryId: string }>
}) {
  const { categoryId } = await params
  return <CategoryProductsView categoryId={categoryId} />
}
