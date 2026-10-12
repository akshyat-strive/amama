import type { OnboardingRole } from "@/features/onboarding/types"

/**
 * A short, stable reference for one account's KYC — the same number the
 * applicant sees on their locked dashboard and the reviewer sees in
 * Tickets, so either side can quote it. Derived from the role and email,
 * so it needs no extra column and never changes for that account.
 */
function kycTicketId(role: OnboardingRole, email: string): string {
  let hash = 0
  for (const char of `${role}:${email.trim().toLowerCase()}`) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return `KYC-${role === "buyer" ? "B" : "S"}${String(hash % 100000).padStart(5, "0")}`
}

export { kycTicketId }
