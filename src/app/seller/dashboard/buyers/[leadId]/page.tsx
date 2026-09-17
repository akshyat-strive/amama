import { SellerBuyerLeadView } from "@/features/dashboard/views/seller-buyer-lead-view"

export default async function Page({
  params,
}: {
  params: Promise<{ leadId: string }>
}) {
  const { leadId } = await params
  return <SellerBuyerLeadView leadId={leadId} />
}
