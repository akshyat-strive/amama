import { auth } from "@/lib/auth/server"
import { apiErrorResponse } from "@/lib/api/errors"
import { db } from "@/lib/db/client"
import { appUsers } from "@/features/identity/lib/schema"
import { adminProfiles, roles } from "@/features/admin/lib/schema"
import { buyerProfiles, sellerProfiles } from "@/features/verification/lib/schema"
import type { RolePermissions } from "@/features/admin/permissions"

const DEMO_PASSWORD = "User@123"

const SEED_ROLES: { id: string; name: string; permissions: RolePermissions; isSystem: boolean }[] = [
  { id: "master-admin", name: "Master Admin", permissions: ["*"], isSystem: true },
  {
    id: "master-kam",
    name: "Master KAM",
    permissions: ["onboarding.review", "listings.moderate", "deals.work", "deals.viewAll", "deals.assign"],
    isSystem: true,
  },
  {
    id: "kam",
    name: "KAM",
    permissions: ["onboarding.review", "listings.moderate", "deals.work", "deals.viewAll"],
    isSystem: true,
  },
  { id: "compliance", name: "Compliance", permissions: ["onboarding.review", "listings.moderate"], isSystem: true },
]

const SEED_ADMINS = [
  { email: "admin@amama.com", name: "Master Admin", roleId: "master-admin" },
  { email: "priya@amama.com", name: "Priya Nair", roleId: "master-kam" },
  { email: "arjun@amama.com", name: "Arjun Mehta", roleId: "kam" },
  { email: "leela@amama.com", name: "Leela Krishnan", roleId: "compliance" },
]

/** The two accounts a client demo actually logs in as — already reviewed
 *  and approved, so signing in drops straight into a working dashboard
 *  with no queue standing in the way. */
const SEED_BUYERS = [
  {
    email: "buyer@amama.in",
    fullName: "Vikram Shah",
    entityType: "organization",
    companyName: "Meridian Global Foods",
    country: "AE",
    businessType: "importerDistributor",
    importLicence: "IEC-AE-778821",
    sourcing: ["tea", "spices", "cashew", "grains"],
    annualVolume: "between100And500",
    incoterm: "cif",
    reviewStatus: "approved" as const,
  },
]

/** New applicants nobody's looked at yet — this is what actually fills the
 *  Buyer queue (`/internal/review-queue/buyer`) with something to review,
 *  rather than every seeded buyer arriving pre-approved. */
const SEED_PENDING_BUYERS = [
  {
    email: "fatima@alwahafresh.example",
    fullName: "Fatima Al-Sayegh",
    entityType: "organization",
    companyName: "Al Waha Fresh Produce LLC",
    country: "AE",
    businessType: "wholesaler",
    importLicence: "IEC-AE-990214",
    sourcing: ["fresh-fruit", "vegetables"],
    annualVolume: "under20",
    incoterm: "fob",
    reviewStatus: "pending" as const,
  },
  {
    email: "chen.wei@goldenharbor.example",
    fullName: "Chen Wei",
    entityType: "organization",
    companyName: "Golden Harbor Trading Co.",
    country: "SG",
    businessType: "importerDistributor",
    importLicence: "SG-IMP-44210",
    sourcing: ["coffee", "cocoa", "nuts"],
    annualVolume: "between20And100",
    incoterm: "cfr",
    reviewStatus: "pending" as const,
  },
  {
    email: "klaus.richter@nordicspice.example",
    fullName: "Klaus Richter",
    entityType: "organization",
    companyName: "Nordic Spice Import GmbH",
    country: "DE",
    businessType: "foodManufacturer",
    importLicence: "DE-EORI-317788",
    sourcing: ["spices", "dried-fruit"],
    annualVolume: "between500And2000",
    incoterm: "dap",
    reviewStatus: "pending" as const,
  },
]

/** Same idea as `SEED_BUYERS` — the two accounts a demo signs in as, both
 *  already approved. */
const SEED_SELLERS = [
  {
    email: "seller@amama.in",
    fullName: "Ravi Kumar",
    entityType: "individual",
    sellerSubType: "trader",
    dateOfBirth: { day: 12, month: 4, year: 1985 },
    farmName: "Ravi Kumar Exports",
    country: "IN",
    region: "Kerala",
    produce: ["tea", "spices", "cashew", "grains"],
    certifications: ["haccp", "iso22000"],
    reviewStatus: "approved" as const,
  },
  {
    email: "kashmir@amama.in",
    fullName: "Aamir Wani",
    entityType: "organization",
    sellerSubType: "producer",
    farmName: "Kashmir Valley Growers",
    country: "IN",
    region: "Shopian, Jammu & Kashmir",
    produce: ["apple"],
    certifications: [],
    reviewStatus: "approved" as const,
  },
]

/** New growers waiting on Compliance/a KAM — fills the Seller queue the
 *  same way `SEED_PENDING_BUYERS` fills the buyer one. */
const SEED_PENDING_SELLERS = [
  {
    email: "meena.iyer@nilgiritea.example",
    fullName: "Meena Iyer",
    entityType: "organization",
    sellerSubType: "producer",
    farmName: "Nilgiri Tea Collective",
    country: "IN",
    region: "Nilgiris, Tamil Nadu",
    produce: ["tea"],
    certifications: ["rainforest"],
    reviewStatus: "pending" as const,
  },
  {
    email: "suresh.patil@konkancashew.example",
    fullName: "Suresh Patil",
    entityType: "individual",
    sellerSubType: "producer",
    dateOfBirth: { day: 3, month: 11, year: 1978 },
    farmName: "Konkan Cashew Farms",
    country: "IN",
    region: "Sindhudurg, Maharashtra",
    produce: ["cashew"],
    certifications: [],
    reviewStatus: "pending" as const,
  },
  {
    email: "harpreet.singh@punjabbasmati.example",
    fullName: "Harpreet Singh",
    entityType: "organization",
    sellerSubType: "trader",
    farmName: "Punjab Basmati Farms",
    country: "IN",
    region: "Amritsar, Punjab",
    produce: ["grains"],
    certifications: ["globalgap"],
    reviewStatus: "pending" as const,
  },
]

/**
 * One-time bootstrap for every demo persona this client demo logs in as —
 * real Managed Better Auth credentials (all sharing `DEMO_PASSWORD`, same
 * convention the old `localStorage` seed used) plus this app's own
 * `app_users`/`admin_profiles`/`buyer_profiles`/`seller_profiles` rows.
 * Guarded on the `roles` table being empty, so it's safe to hit more than
 * once — the second call is just a no-op.
 *
 * Every admin-kind account is also given Better Auth's own built-in
 * `role: "admin"` here (see `admin-user-service.ts`'s `createAdminUser`
 * for why) — but `signUp.email` doesn't accept that flag, only
 * `admin.createUser` does, and *that* needs an existing admin session
 * this route doesn't have. Bootstrapping it is a one-time manual step
 * outside the app (see the deploy notes), not something this route can
 * do to itself.
 *
 * Must be called with an `Origin` header (any real browser request has
 * one) — Better Auth's proxy rejects `signUp.email` without one, since it
 * can't otherwise validate the callback origin.
 */
export async function POST() {
  try {
    // Roles and admin accounts are a true one-time bootstrap — re-running
    // this would try to re-insert the fixed role ids and re-sign-up the
    // same admin emails, so it stays gated on the roles table being empty.
    const existingRoles = await db.select({ id: roles.id }).from(roles).limit(1)
    const createdAdmins: string[] = []
    if (existingRoles.length === 0) {
      await db.insert(roles).values(SEED_ROLES)
      for (const admin of SEED_ADMINS) {
        const { data, error } = await auth.signUp.email({ email: admin.email, password: DEMO_PASSWORD, name: admin.name })
        if (error || !data?.user) continue
        await db.insert(appUsers).values({ id: data.user.id, kind: "admin" })
        await db.insert(adminProfiles).values({ userId: data.user.id, name: admin.name, roleId: admin.roleId, createdBy: null })
        createdAdmins.push(admin.email)
      }
    }

    // Buyers and sellers, by contrast, always run: `auth.signUp.email`
    // errors for an email that already exists, which the `continue` below
    // treats as "already there, skip it" — so calling this route again
    // after adding a new name to `SEED_PENDING_BUYERS`/`SEED_PENDING_SELLERS`
    // only ever creates the new ones, never touches the existing accounts.
    const createdBuyers: string[] = []
    for (const buyer of [...SEED_BUYERS, ...SEED_PENDING_BUYERS]) {
      const { data, error } = await auth.signUp.email({ email: buyer.email, password: DEMO_PASSWORD, name: buyer.fullName })
      if (error || !data?.user) continue
      await db.insert(appUsers).values({ id: data.user.id, kind: "buyer" })
      await db.insert(buyerProfiles).values({
        userId: data.user.id,
        fullName: buyer.fullName,
        entityType: buyer.entityType,
        companyName: buyer.companyName,
        country: buyer.country,
        businessType: buyer.businessType,
        importLicence: buyer.importLicence,
        sourcing: buyer.sourcing,
        annualVolume: buyer.annualVolume,
        incoterm: buyer.incoterm,
        reviewStatus: buyer.reviewStatus,
        submittedAt: new Date(),
        reviewedAt: buyer.reviewStatus === "approved" ? new Date() : null,
      })
      createdBuyers.push(buyer.email)
    }

    const createdSellers: string[] = []
    for (const seller of [...SEED_SELLERS, ...SEED_PENDING_SELLERS]) {
      const { data, error } = await auth.signUp.email({ email: seller.email, password: DEMO_PASSWORD, name: seller.fullName })
      if (error || !data?.user) continue
      await db.insert(appUsers).values({ id: data.user.id, kind: "seller" })
      await db.insert(sellerProfiles).values({
        userId: data.user.id,
        fullName: seller.fullName,
        entityType: seller.entityType,
        sellerSubType: seller.sellerSubType,
        dateOfBirth: seller.dateOfBirth ?? null,
        farmName: seller.farmName,
        country: seller.country,
        region: seller.region,
        produce: seller.produce,
        certifications: seller.certifications,
        reviewStatus: seller.reviewStatus,
        submittedAt: new Date(),
        reviewedAt: seller.reviewStatus === "approved" ? new Date() : null,
      })
      createdSellers.push(seller.email)
    }

    return Response.json({ seeded: true, roles: SEED_ROLES.length, createdAdmins, createdBuyers, createdSellers })
  } catch (error) {
    return apiErrorResponse(error)
  }
}
