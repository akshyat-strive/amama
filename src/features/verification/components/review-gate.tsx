"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import type { OnboardingRole } from "@/features/onboarding/types"
import { ApplicantKycTicket } from "@/features/verification/components/applicant-ticket"
import { useVerification } from "@/features/verification/verification-context"

/** Pages that stay open before approval — the ticket and settings. */
const OPEN_ROUTES = ["/verification", "/settings"]

/**
 * Sits inside the dashboard shell, so the sidebar and topbar are there
 * from day one — with every other page locked. Until a KAM approves the
 * KYC, any locked page shows the applicant's ticket instead: where it
 * stands, what's needed, and the conversation.
 */
function ReviewGate({ role, children }: { role: OnboardingRole; children: React.ReactNode }) {
  const pathname = usePathname()
  const { statusFor } = useVerification()

  if (statusFor(role) === "approved") return <>{children}</>
  if (OPEN_ROUTES.some((route) => pathname.endsWith(route))) return <>{children}</>
  return <ApplicantKycTicket role={role} />
}

export { ReviewGate }
