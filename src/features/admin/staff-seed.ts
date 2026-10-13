import { DOMAIN_ACTIONS, VIEW_EVERYTHING, type Domain, type Permission, type RolePermissions } from "@/features/admin/permissions"

/** Where a role sits: executives see everything, leads run a domain,
 *  members do the domain's work on what's assigned to them. */
export type RoleLevel = "executive" | "lead" | "member"

export const LEVEL_LABEL: Record<RoleLevel, string> = { executive: "Executive", lead: "Lead", member: "Member" }

export type Role = {
  id: string
  name: string
  level: RoleLevel
  /** `all` only for the chief executive. */
  domain: Domain | "all"
  permissions: RolePermissions
  isSystem: boolean
  createdAt: string
}

export type AdminUser = {
  /** The email — stable across reseeds, and what deals and contracts
   *  already record as their KAM. */
  id: string
  name: string
  email: string
  roleId: string
  /** Who this person reports to — the hierarchy the org chart draws. */
  reportsTo: string | null
  title: string
  createdAt: string
  createdBy: string | null
}

const SEEDED_AT = "2026-06-01T09:00:00.000Z"

const executive = (domain: Domain): Permission[] => [...new Set([...VIEW_EVERYTHING, ...DOMAIN_ACTIONS[domain], "announcements.post" as Permission])]

const role = (id: string, name: string, level: RoleLevel, domain: Role["domain"], permissions: RolePermissions): Role => ({
  id,
  name,
  level,
  domain,
  permissions,
  isSystem: true,
  createdAt: SEEDED_AT,
})

export const SEED_ROLES: Role[] = [
  role("ceo", "Chief Executive", "executive", "all", ["*"]),
  role("exec-saleops", "SaleOps Executive", "executive", "saleops", executive("saleops")),
  role("exec-logistics", "Logistics Executive", "executive", "logistics", executive("logistics")),
  role("exec-finance", "Finance Executive", "executive", "finance", executive("finance")),
  role("exec-finops", "FinOps Executive", "executive", "finops", executive("finops")),
  role("saleops-lead", "Lead KAM", "lead", "saleops", [
    "overview.view",
    "team.view",
    "onboarding.review",
    "onboarding.viewAll",
    "onboarding.assign",
    "listings.moderate",
    "deals.work",
    "deals.viewAll",
    "deals.assign",
  ]),
  role("kam", "KAM", "member", "saleops", ["onboarding.review", "listings.moderate", "deals.work"]),
  role("logistics-lead", "Logistics Lead", "lead", "logistics", ["overview.view", "team.view", "logistics.view", "logistics.manage", "deals.viewAll"]),
  role("logistics-coordinator", "Logistics Coordinator", "member", "logistics", ["logistics.view", "logistics.manage"]),
  role("finance-lead", "Finance Lead", "lead", "finance", ["overview.view", "team.view", "finance.view", "finance.manage"]),
  role("accounts", "Accounts Executive", "member", "finance", ["finance.view"]),
  role("finops-lead", "FinOps Lead", "lead", "finops", ["overview.view", "team.view", "finops.view", "finops.manage", "finance.view"]),
  role("compliance", "Compliance Analyst", "member", "finops", ["finops.view", "onboarding.viewAll"]),
]

const staff = (email: string, name: string, roleId: string, reportsTo: string | null, title: string): AdminUser => ({
  id: email,
  email,
  name,
  roleId,
  reportsTo,
  title,
  createdAt: SEEDED_AT,
  createdBy: null,
})

/**
 * The org this demo runs: a chief executive, one executive per domain,
 * and each domain's lead and members under them. Every account signs in
 * with `DEMO_PASSWORD`.
 */
export const SEED_STAFF: AdminUser[] = [
  staff("admin@amama.com", "Vikram Menon", "ceo", null, "Chief Executive Officer"),
  staff("nisha@amama.com", "Nisha Rao", "exec-saleops", "admin@amama.com", "Head of SaleOps"),
  staff("sanjay@amama.com", "Sanjay Kulkarni", "exec-logistics", "admin@amama.com", "Head of Logistics"),
  staff("kavita@amama.com", "Kavita Iyer", "exec-finance", "admin@amama.com", "Head of Finance"),
  staff("imran@amama.com", "Imran Shaikh", "exec-finops", "admin@amama.com", "Head of FinOps"),
  staff("priya@amama.com", "Priya Nair", "saleops-lead", "nisha@amama.com", "Lead Key Account Manager"),
  staff("arjun@amama.com", "Arjun Mehta", "kam", "priya@amama.com", "Key Account Manager"),
  staff("rohit@amama.com", "Rohit Verma", "kam", "priya@amama.com", "Key Account Manager"),
  staff("pradeep@amama.com", "Pradeep Rao", "logistics-lead", "sanjay@amama.com", "Logistics Lead"),
  staff("arun@amama.com", "Arun Das", "logistics-coordinator", "pradeep@amama.com", "Logistics Coordinator"),
  staff("devika@amama.com", "Devika Shah", "finance-lead", "kavita@amama.com", "Finance Lead"),
  staff("meera@amama.com", "Meera Joshi", "accounts", "devika@amama.com", "Accounts Executive"),
  staff("farhan@amama.com", "Farhan Qureshi", "finops-lead", "imran@amama.com", "FinOps Lead"),
  staff("leela@amama.com", "Leela Krishnan", "compliance", "farhan@amama.com", "Compliance Analyst"),
]

/** Every seeded and created account shares this password — a demo
 *  convenience, shown on the quick-login list and `/creds`. */
export const DEMO_PASSWORD = "User@123"
