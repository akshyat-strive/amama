import { redirect } from "next/navigation"

export default async function Page({ params }: { params: Promise<{ tradeId: string }> }) {
  const { tradeId } = await params
  redirect(`/seller/dashboard/orders/${tradeId}`)
}
