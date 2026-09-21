/**
 * One barrel so `drizzle-kit` (and anything that wants every table at
 * once) has a single entry point — the tables themselves stay declared
 * next to the feature they belong to, not here.
 */
export * from "@/features/identity/lib/schema"
export * from "@/features/admin/lib/schema"
export * from "@/features/verification/lib/schema"
export * from "@/features/marketplace/lib/schema"
export * from "@/features/marketplace/lib/deal-schema"
export * from "@/features/contracts/lib/schema"
