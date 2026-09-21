import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { appUsers } from "@/features/identity/lib/schema"
import type { DateParts } from "@/components/ui/date-of-birth-picker"

/**
 * Buyer and seller profiles fold together what used to be two separate
 * stores — `onboarding-context.tsx`'s in-progress draft and
 * `verification-context.tsx`'s submitted-for-review record. A real user
 * gets one row the moment they sign up; onboarding just keeps `PATCH`ing
 * it, and submitting flips `reviewStatus` from `"draft"` onward. That also
 * removes the old prototype's "exactly one submission per role, globally"
 * limitation, which only existed because `localStorage` had no user ids to
 * key rows by.
 */
export type ReviewStatus = "draft" | "pending" | "approved" | "changes-requested"

const buyerProfiles = pgTable("buyer_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => appUsers.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull().default(""),
  entityType: text("entity_type").notNull().default(""),
  dateOfBirth: jsonb("date_of_birth").$type<DateParts | null>(),
  companyName: text("company_name").notNull().default(""),
  country: text("country").notNull().default(""),
  businessType: text("business_type").notNull().default(""),
  importLicence: text("import_licence").notNull().default(""),
  sourcing: text("sourcing").array().notNull().default([]),
  annualVolume: text("annual_volume").notNull().default(""),
  incoterm: text("incoterm").notNull().default(""),

  reviewStatus: text("review_status").$type<ReviewStatus>().notNull().default("draft"),
  reviewerNote: text("reviewer_note"),
  reviewedByAdminId: uuid("reviewed_by_admin_id"),
  reviewedByName: text("reviewed_by_name"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

const sellerProfiles = pgTable("seller_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => appUsers.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull().default(""),
  entityType: text("entity_type").notNull().default(""),
  sellerSubType: text("seller_sub_type").notNull().default(""),
  dateOfBirth: jsonb("date_of_birth").$type<DateParts | null>(),
  farmName: text("farm_name").notNull().default(""),
  country: text("country").notNull().default(""),
  region: text("region").notNull().default(""),
  farmSize: text("farm_size").notNull().default(""),
  producerType: text("producer_type").notNull().default(""),
  produce: text("produce").array().notNull().default([]),
  certifications: text("certifications").array().notNull().default([]),

  reviewStatus: text("review_status").$type<ReviewStatus>().notNull().default("draft"),
  reviewerNote: text("reviewer_note"),
  reviewedByAdminId: uuid("reviewed_by_admin_id"),
  reviewedByName: text("reviewed_by_name"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

/** One uploaded KYC document. `storageKey` points into the `uploads`
 *  bucket (see `src/lib/storage/files.ts`) — replaces the old
 *  `dataUrl`-in-`localStorage` approach entirely. */
const submissionDocuments = pgTable("submission_documents", {
  id: text("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => appUsers.id, { onDelete: "cascade" }),
  role: text("role").$type<"buyer" | "seller">().notNull(),
  name: text("name").notNull(),
  size: integer("size").notNull(),
  required: boolean("required").notNull().default(false),
  storageKey: text("storage_key").notNull(),
  reviewStatus: text("review_status").$type<"pending" | "approved" | "rejected">().notNull().default("pending"),
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

export { buyerProfiles, sellerProfiles, submissionDocuments }
