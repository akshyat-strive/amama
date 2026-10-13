"use client"

import type { OnboardingRole } from "@/features/onboarding/types"
import { useKycApplications, useKycLoaded } from "@/features/verification/kyc-store"
import type { KycApplication } from "@/features/verification/kyc-types"

/** One applicant's full application, as the review side sees it. */
export type AdminSubmission = KycApplication

function useVerificationQueue(role: OnboardingRole): AdminSubmission[] {
  return useKycApplications().filter((application) => application.role === role)
}

/** All applications across both roles. */
function useAllVerificationQueues(): AdminSubmission[] {
  return useKycApplications()
}

/** Both roles share one store, so this is the same flag for either. */
function useVerificationQueueLoaded(): boolean {
  return useKycLoaded()
}

function useAllVerificationQueuesLoaded(): boolean {
  return useKycLoaded()
}

export {
  useVerificationQueue,
  useAllVerificationQueues,
  useVerificationQueueLoaded,
  useAllVerificationQueuesLoaded,
}
export {
  approveApplication,
  requestApplicationChanges,
  setDocumentStatus,
  requestDocument,
  withdrawRequest,
  addStaffComment,
  assignTicket,
} from "@/features/verification/kyc-store"
