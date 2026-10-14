import type { OnboardingRole } from "@/features/onboarding/types"
import type { KycApplication, KycTicket, KycTicketStatus } from "@/features/verification/kyc-types"

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

/** The account's nth ticket: the first keeps the bare account number, so
 *  references quoted before later tickets existed still resolve. */
function kycTicketNumber(role: OnboardingRole, email: string, seq: number): string {
  const base = kycTicketId(role, email)
  return seq <= 1 ? base : `${base}-${seq}`
}

/** Where a ticket stands, from its items: anything the applicant still owes
 *  means it's waiting on them; otherwise it's with the KAM — "in progress"
 *  once someone owns it. */
function deriveTicketStatus(application: Pick<KycApplication, "reviewerNote">, ticket: KycTicket): KycTicketStatus {
  if (ticket.resolvedAt) return "resolved"
  const owed = ticket.items.some((entry) => entry.status === "missing" || entry.status === "rejected" || entry.status === "update-requested")
  if (owed || (ticket.origin === "onboarding" && application.reviewerNote !== null)) return "waiting"
  return ticket.assignee ? "in-progress" : "open"
}

export { kycTicketId, kycTicketNumber, deriveTicketStatus }
