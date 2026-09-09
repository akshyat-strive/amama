import { ListingFormView } from "@/features/dashboard/views/listing-form-view"

export default async function Page({
  params,
}: {
  params: Promise<{ listingId: string }>
}) {
  const { listingId } = await params
  return <ListingFormView listingId={listingId} />
}
