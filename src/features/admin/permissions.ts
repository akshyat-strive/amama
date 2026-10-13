/**
 * The fixed catalog of things a permission can actually unlock in this app.
 * Deliberately NOT user-definable — a role's `permissions` list can only
 * ever reference one of these ids, because each one corresponds to a real
 * gate somewhere in the code. Roles themselves (which permissions bundle
 * together under what name) ARE runtime-editable — see `role-store.ts`.
 *
 * Access works on two axes: the domain a permission belongs to (what kind
 * of work), and `.view` vs action permissions (seeing versus doing).
 * Executives hold every `.view`, so they see everything; members hold
 * their own domain's actions.
 */
export type Permission =
  // Company-wide
  | "overview.view"
  | "team.view"
  | "announcements.post"
  | "users.manage"
  | "roles.manage"
  // SaleOps
  | "onboarding.review"
  | "onboarding.viewAll"
  | "onboarding.assign"
  | "listings.moderate"
  | "deals.work"
  | "deals.viewAll"
  | "deals.assign"
  // Logistics
  | "logistics.view"
  | "logistics.manage"
  // Finance
  | "finance.view"
  | "finance.manage"
  // FinOps
  | "finops.view"
  | "finops.manage"

export type Domain = "saleops" | "logistics" | "finance" | "finops"

export const DOMAINS: { id: Domain; label: string; description: string }[] = [
  { id: "saleops", label: "SaleOps", description: "KYC tickets, accounts, listings and deals." },
  { id: "logistics", label: "Logistics", description: "Shipments, cold chain and trade execution." },
  { id: "finance", label: "Finance", description: "Invoicing, credit and the books." },
  { id: "finops", label: "FinOps", description: "Payments, settlement, escrow and compliance." },
]

export const DOMAIN_LABEL: Record<Domain | "all", string> = {
  all: "All domains",
  saleops: "SaleOps",
  logistics: "Logistics",
  finance: "Finance",
  finops: "FinOps",
}

type PermissionEntry = { id: Permission; label: string; description: string; domain: Domain | "company" }

export const PERMISSION_CATALOG: PermissionEntry[] = [
  { id: "overview.view", domain: "company", label: "View overview", description: "Cross-team stats on the home page." },
  { id: "team.view", domain: "company", label: "View team", description: "See the org chart and who holds which role." },
  { id: "announcements.post", domain: "company", label: "Post announcements", description: "Broadcast to every signed-in staff member." },
  { id: "users.manage", domain: "company", label: "Manage users", description: "Create accounts and change who holds which role." },
  { id: "roles.manage", domain: "company", label: "Manage roles", description: "Create roles and edit which permissions they carry." },
  { id: "onboarding.review", domain: "saleops", label: "Review KYC", description: "Approve documents, comment and request more." },
  { id: "onboarding.viewAll", domain: "saleops", label: "View every KYC ticket", description: "Not just the tickets assigned to you." },
  { id: "onboarding.assign", domain: "saleops", label: "Assign KYC tickets", description: "Choose which KAM owns a ticket." },
  { id: "listings.moderate", domain: "saleops", label: "Moderate listings", description: "Verify or flag marketplace listings." },
  { id: "deals.work", domain: "saleops", label: "Work assigned deals", description: "Drive a deal forward once it's yours." },
  { id: "deals.viewAll", domain: "saleops", label: "View every deal", description: "Every deal across the team, not just your own." },
  { id: "deals.assign", domain: "saleops", label: "Assign deals", description: "Choose which KAM owns a deal." },
  { id: "logistics.view", domain: "logistics", label: "View logistics", description: "Shipments, bookings and cold-chain readings." },
  { id: "logistics.manage", domain: "logistics", label: "Run logistics", description: "Book, dispatch and update shipments." },
  { id: "finance.view", domain: "finance", label: "View finance", description: "Invoices, credit and receivables." },
  { id: "finance.manage", domain: "finance", label: "Run finance", description: "Raise invoices and approve credit." },
  { id: "finops.view", domain: "finops", label: "View FinOps", description: "Payments, escrow and settlement status." },
  { id: "finops.manage", domain: "finops", label: "Run FinOps", description: "Release payments and settle trades." },
]

/** Every `.view` permission — what makes an executive see everything. */
export const VIEW_EVERYTHING: Permission[] = [
  "overview.view",
  "team.view",
  "onboarding.viewAll",
  "deals.viewAll",
  "logistics.view",
  "finance.view",
  "finops.view",
]

/** Each domain's action permissions — what a domain's own staff can do. */
export const DOMAIN_ACTIONS: Record<Domain, Permission[]> = {
  saleops: ["onboarding.review", "onboarding.assign", "listings.moderate", "deals.work", "deals.assign"],
  logistics: ["logistics.manage"],
  finance: ["finance.manage"],
  finops: ["finops.manage"],
}

/** `["*"]` is the wildcard sentinel — "every permission," same shape the
 *  client's own reference backend uses (`canView: ['*']` for its admin
 *  role) rather than a separate boolean flag to keep in sync. */
export type RolePermissions = Permission[] | ["*"]

export function hasPermission(perms: RolePermissions, perm: Permission): boolean {
  return isFullAccess(perms) || (perms as Permission[]).includes(perm)
}

/** Whether a role's permission list is the `["*"]` wildcard — every
 *  permission, not just a long explicit list of them. */
export function isFullAccess(perms: RolePermissions): boolean {
  return (perms as string[]).includes("*")
}
