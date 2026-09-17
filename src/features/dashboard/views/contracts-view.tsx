"use client"

import { ContractsView } from "@/features/contracts/contracts-view"
import { buyerIdentity, sellerIdentity } from "@/features/marketplace/identity"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import type { OnboardingRole } from "@/features/onboarding/types"

/** Resolves who's looking, then hands off to the one shared contracts
 *  surface — a buyer and a seller read the same record, filtered to the
 *  contracts they're actually party to. */
function DashboardContractsView({ role }: { role: OnboardingRole }) {
  const { draft } = useOnboarding()
  const identity = role === "buyer" ? buyerIdentity(draft.buyer) : sellerIdentity(draft.seller)
  return <ContractsView viewer={role} identity={identity} />
}

export { DashboardContractsView }
