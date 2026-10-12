import { redirect } from "next/navigation"

/** Preferences now live on the "What do you buy?" step. */
export default async function BuyerVolumePage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams
  redirect(from ? `/buyer/onboarding/sourcing?from=${encodeURIComponent(from)}` : "/buyer/onboarding/sourcing")
}
