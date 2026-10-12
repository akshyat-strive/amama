import { redirect } from "next/navigation"

/** Buyers follow their trades as orders now. */
export default async function Page({ params }: { params: Promise<{ tradeId: string }> }) {
  const { tradeId } = await params
  redirect(`/buyer/dashboard/orders/${tradeId}`)
}
