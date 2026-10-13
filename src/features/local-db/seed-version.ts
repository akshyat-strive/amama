/*
 * The whole app runs on seed data plus whatever this browser has changed
 * since — there is no server. Each store seeds itself the first time it's
 * read on a fresh browser and from then on reads back what's stored, so a
 * demo keeps every approval, upload and message across reloads.
 *
 * `SEED_VERSION` is the one switch for "the seed itself changed": a
 * browser holding an older generation gets every demo key cleared once, so
 * the new seed can land instead of being skipped by each store's "only if
 * empty" guard.
 */

const SEED_VERSION = "10"
const VERSION_KEY = "amama.admin.seedVersion"

/** Everything a version bump wipes. The language, sidebar state and the
 *  in-progress onboarding draft stay — they're preferences, not data. */
const DEMO_LOCAL_STORAGE_KEYS = [
  "amama.auth.accounts",
  "amama.auth.session",
  "amama.profiles",
  "amama.admin.staff",
  "amama.admin.roles",
  "amama.kyc.applications",
  "amama.marketplace.deals",
  "amama.marketplace.conversations",
  "amama.marketplace.listings",
  "amama.marketplace.rfqs",
  "amama.marketplace.formRequests",
  "amama.marketplace.kamThreads",
  "amama.marketplace.wishlist",
  "amama.buyerDirectory",
  "amama.admin.staffChat",
  "amama.contracts",
  "amama.documents.draft",
  "amama.tradechain.actions.v1",
  "amama.verification",
] as const

const listeners = new Set<() => void>()
let checked = false

/** Runs once per page load, before any store reads its key. */
function ensureSeedVersion() {
  if (checked || typeof window === "undefined") return
  checked = true
  try {
    const stored = window.localStorage.getItem(VERSION_KEY)
    if (stored === SEED_VERSION) return
    if (stored !== null) {
      for (const key of DEMO_LOCAL_STORAGE_KEYS) window.localStorage.removeItem(key)
      void import("@/features/local-db/file-store").then(({ clearFiles }) => clearFiles())
    }
    window.localStorage.setItem(VERSION_KEY, SEED_VERSION)
  } catch {
    // Storage blocked — every store falls back to its in-memory seed.
  }
}

/** Wipes every demo key and reloads, so each store reseeds from scratch —
 *  Settings' "Reset demo data". */
function resetDemoData() {
  if (typeof window === "undefined") return
  try {
    for (const key of DEMO_LOCAL_STORAGE_KEYS) window.localStorage.removeItem(key)
    window.localStorage.setItem(VERSION_KEY, SEED_VERSION)
  } catch {
    // Nothing to clear.
  }
  listeners.forEach((listener) => listener())
  void import("@/features/local-db/file-store").then(async ({ clearFiles }) => {
    await clearFiles()
    window.location.reload()
  })
}

export { SEED_VERSION, DEMO_LOCAL_STORAGE_KEYS, ensureSeedVersion, resetDemoData }
