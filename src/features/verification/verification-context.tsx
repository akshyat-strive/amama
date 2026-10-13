"use client"

import { useSession } from "@/features/auth/local-auth"
import type { OnboardingRole } from "@/features/onboarding/types"
import { useKycApplications, useKycLoaded } from "@/features/verification/kyc-store"
import type { KycApplication, ReviewStatus } from "@/features/verification/kyc-types"

export type { ReviewStatus, DocumentReviewStatus } from "@/features/verification/kyc-types"

/**
 * The signed-in buyer's or seller's own application — never anyone
 * else's. `applicationFor(role)` is null until they submit.
 */
function useVerification() {
  const session = useSession()
  const applications = useKycApplications()
  const loaded = useKycLoaded()

  const applicationFor = (role: OnboardingRole): KycApplication | null => {
    if (!session || session.kind !== role) return null
    return applications.find((application) => application.role === role && application.userId === session.accountId) ?? null
  }

  return {
    applicationFor,
    /** Whether storage has been read — check before trusting `statusFor`,
     *  which can't otherwise tell "still loading" from `not-submitted`. */
    isLoaded: (): boolean => loaded,
    statusFor: (role: OnboardingRole): ReviewStatus => applicationFor(role)?.reviewStatus ?? "not-submitted",
  }
}

export { useVerification }
