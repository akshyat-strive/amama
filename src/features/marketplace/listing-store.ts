"use client"

import * as React from "react"

/**
 * `unverified` is the default the moment a listing is published — it still
 * shows in the marketplace exactly like a verified one; there's no
 * "unverified" badge anywhere a buyer would see it, because flashing that
 * at a buyer would just make every new seller's first listing look
 * suspicious for no reason. `verified` is a KAM's explicit sign-off, shown
 * as a badge. `flagged` is the one that actually changes marketplace
 * behaviour — it's pulled from the buyer-facing catalog entirely, with the
 * reason and who did it visible only on the seller's own copy.
 */
export type ModerationStatus = "unverified" | "verified" | "flagged"

export type Listing = {
  id: string
  sellerId: string
  sellerName: string
  cropId: string
  variety: string
  grade: string
  quantityMt: number
  pricePerTonneUsd: number
  country: string
  region: string
  description: string
  /** An `images.unsplash.com/<id>` id — see `crops` in onboarding/steps.ts,
   *  the same catalog a listing's crop photo is drawn from by default. */
  photo: string
  /** Where the seller placed their pin on the proximity map, as a 0–100
   *  percentage of the tile — cosmetic, never real coordinates. Defaults
   *  to the centre. */
  pinX: number
  pinY: number
  createdAt: string
  moderationStatus: ModerationStatus
  /** The KAM's reason, when a listing is flagged. Optional even then. */
  moderationNote: string | null
  moderatedBy: string | null
  moderatedAt: string | null
  /** Soft delete — a "removed" listing stays in the store (so anyone who
   *  already has a conversation about it still has a record to look back
   *  on) but drops out of the marketplace and the seller's own catalog. */
  deletedAt: string | null
}

const STORAGE_KEY = "amama.marketplace.listings"

/**
 * A starter catalog so the marketplace isn't showing an empty room the
 * first time anyone opens it — a handful of other sellers' listings,
 * seeded straight into the same store a real seller's own listings land
 * in via `addListing`. Fixed ids and timestamps, not generated, so this
 * array is identical on every load until someone actually adds to it.
 * A mix of moderation states on purpose, so both the marketplace filter
 * and the KAM console have something real to show.
 */
const SEED_LISTINGS: Listing[] = [
  {
    id: "seed-1",
    sellerId: "seed-krishna-valley",
    sellerName: "Krishna Valley Farmers Cooperative",
    cropId: "fresh-fruit",
    variety: "Bhagwa Pomegranate",
    grade: "Grade A+",
    quantityMt: 40,
    pricePerTonneUsd: 800,
    country: "IN",
    region: "Nashik, Maharashtra",
    description:
      "Hand-picked Bhagwa pomegranate straight from the orchard, cold-chain from harvest. Residue-tested, export sizing (250g+).",
    photo: "photo-1619566636858-adf3ef46400b",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-08-02T09:00:00.000Z",
    moderationStatus: "verified",
    moderationNote: null,
    moderatedBy: "Priya Nair",
    moderatedAt: "2026-08-03T10:00:00.000Z",
    deletedAt: null,
  },
  {
    id: "seed-2",
    sellerId: "seed-coorg-estates",
    sellerName: "Coorg Estates Coffee Growers",
    cropId: "coffee",
    variety: "Arabica Plantation A",
    grade: "Grade A+",
    quantityMt: 25,
    pricePerTonneUsd: 4200,
    country: "IN",
    region: "Coorg, Karnataka",
    description:
      "Shade-grown high-altitude Arabica, wet-processed. Cupping notes of citrus and dark chocolate. Full traceability to plot level.",
    photo: "photo-1447933601403-0c6688de566e",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-08-05T09:00:00.000Z",
    moderationStatus: "verified",
    moderationNote: null,
    moderatedBy: "Priya Nair",
    moderatedAt: "2026-08-06T10:00:00.000Z",
    deletedAt: null,
  },
  {
    id: "seed-3",
    sellerId: "seed-kerala-cashew",
    sellerName: "Kerala Cashew Traders",
    cropId: "cashew",
    variety: "W-240",
    grade: "Grade A+",
    quantityMt: 30,
    pricePerTonneUsd: 5400,
    country: "IN",
    region: "Kollam, Kerala",
    description:
      "Steam-processed W-240 cashew kernels, vacuum-packed in 25lb tins. Moisture-controlled storage, aflatoxin-tested every batch.",
    photo: "photo-1626697556426-8a55a8af4999",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-08-08T09:00:00.000Z",
    moderationStatus: "verified",
    moderationNote: null,
    moderatedBy: "Priya Nair",
    moderatedAt: "2026-08-09T10:00:00.000Z",
    deletedAt: null,
  },
  {
    id: "seed-4",
    sellerId: "seed-mekong-grain",
    sellerName: "Mekong Grain Traders",
    cropId: "grains",
    variety: "Jasmine Rice",
    grade: "Grade A",
    quantityMt: 50,
    pricePerTonneUsd: 320,
    country: "VN",
    region: "An Giang, Mekong Delta",
    description:
      "Fragrant long-grain jasmine rice, milled to order. Broken-grain content under 5%. Jute or PP bag packing, buyer's choice.",
    photo: "photo-1595444042058-f038c7e0e778",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-08-10T09:00:00.000Z",
    moderationStatus: "unverified",
    moderationNote: null,
    moderatedBy: null,
    moderatedAt: null,
    deletedAt: null,
  },
  {
    id: "seed-5",
    sellerId: "seed-rift-valley-sesame",
    sellerName: "Rift Valley Sesame Growers",
    cropId: "sesame",
    variety: "Natural White",
    grade: "Grade A",
    quantityMt: 22,
    pricePerTonneUsd: 1500,
    country: "ET",
    region: "Humera, Tigray",
    description:
      "Sun-dried Humera white sesame, hand-sorted for purity (99.5%+). A staple for the Gulf and East Asian tahini and oil trade.",
    photo: "photo-1547496502-affa22d38842",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-08-12T09:00:00.000Z",
    moderationStatus: "verified",
    moderationNote: null,
    moderatedBy: "Priya Nair",
    moderatedAt: "2026-08-13T10:00:00.000Z",
    deletedAt: null,
  },
  {
    id: "seed-6",
    sellerId: "seed-ceylon-spice",
    sellerName: "Ceylon Spice Gardens",
    cropId: "spices",
    variety: "Alba Cinnamon Quills",
    grade: "Grade A+",
    quantityMt: 12,
    pricePerTonneUsd: 3200,
    country: "LK",
    region: "Galle",
    description:
      "True Ceylon cinnamon (Cinnamomum verum), hand-rolled Alba-grade quills. EU and US spice-board compliant.",
    photo: "photo-1525289722380-f5bf1653d504",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-08-14T09:00:00.000Z",
    // Seeded already-flagged, so the KAM console and the seller's own
    // catalog both have a real example to show without anyone having to
    // click through the moderation flow first.
    moderationStatus: "flagged",
    moderationNote:
      "The listing photos look like stock cinnamon, not this season's stock — please swap in real photos of the current lot before this goes back on the marketplace.",
    moderatedBy: "Priya Nair",
    moderatedAt: "2026-08-20T11:30:00.000Z",
    deletedAt: null,
  },
  {
    id: "seed-7",
    sellerId: "seed-nandi-tea",
    sellerName: "Nandi Hills Tea Estate",
    cropId: "tea",
    variety: "Nilgiri Orthodox",
    grade: "Grade A",
    quantityMt: 15,
    pricePerTonneUsd: 2900,
    country: "IN",
    region: "Nilgiris, Tamil Nadu",
    description:
      "High-grown orthodox black tea, bright liquor with a brisk finish. Available as whole leaf or broken grade on request.",
    photo: "photo-1563822249366-3efb23b8e0c9",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-08-16T09:00:00.000Z",
    moderationStatus: "verified",
    moderationNote: null,
    moderatedBy: "Priya Nair",
    moderatedAt: "2026-08-17T10:00:00.000Z",
    deletedAt: null,
  },
  {
    id: "seed-8",
    sellerId: "seed-savannah-nuts",
    sellerName: "Savannah Groundnut Cooperative",
    cropId: "nuts",
    variety: "Bold Groundnut",
    grade: "Grade A",
    quantityMt: 18,
    pricePerTonneUsd: 6200,
    country: "GH",
    region: "Tamale",
    description:
      "Hand-picked bold-variety groundnuts, sun-dried to 7% moisture. Sorted to remove shrivelled and discoloured kernels.",
    photo: "photo-1608797178974-15b35a64ede9",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-08-18T09:00:00.000Z",
    moderationStatus: "unverified",
    moderationNote: null,
    moderatedBy: null,
    moderatedAt: null,
    deletedAt: null,
  },
  {
    id: "seed-9",
    sellerId: "kashmir@amama.in",
    sellerName: "Kashmir Valley Growers",
    cropId: "apple",
    variety: "Kashmiri Apple",
    grade: "Grade A+",
    quantityMt: 25,
    pricePerTonneUsd: 950,
    country: "IN",
    region: "Shopian, Jammu & Kashmir",
    description:
      "Crisp, high-colour Kashmiri apples straight from CA (controlled-atmosphere) storage. Hand-sorted, waxed, export-packed in 20kg cartons.",
    photo: "photo-1560806887-1e4cd0b6cbd6",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-08-19T09:00:00.000Z",
    moderationStatus: "verified",
    moderationNote: null,
    moderatedBy: "Priya Nair",
    moderatedAt: "2026-08-20T10:00:00.000Z",
    deletedAt: null,
  },
  {
    id: "seed-10",
    sellerId: "seed-shimla-orchards",
    sellerName: "Shimla Hills Orchards Cooperative",
    cropId: "apple",
    variety: "Shimla Royal Gala",
    grade: "Grade A",
    quantityMt: 35,
    pricePerTonneUsd: 880,
    country: "IN",
    region: "Shimla, Himachal Pradesh",
    description:
      "Royal Gala apples grown at altitude for a deeper blush and sweeter finish. Cold-chain from orchard to port, sized 150–200g.",
    photo: "photo-1560806887-1e4cd0b6cbd6",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-08-20T09:00:00.000Z",
    moderationStatus: "unverified",
    moderationNote: null,
    moderatedBy: null,
    moderatedAt: null,
    deletedAt: null,
  },
  /* Ravi Kumar's own catalog — the demo seller account (see
   * `demo-accounts.ts` / `admin/seed-data.ts`). Four listings on purpose:
   * one already shipping, one already agreed and in contracting, one
   * fresh off a negotiation, and one just sitting in the marketplace with
   * nothing against it yet — so the demo's "seller posted 4 products"
   * line has real, distinct rows behind it, not a single repeated case. */
  {
    id: "demo-tea-1",
    sellerId: "seller@amama.in",
    sellerName: "Ravi Kumar",
    cropId: "tea",
    variety: "Nilgiri Orthodox",
    grade: "Grade A",
    quantityMt: 15,
    pricePerTonneUsd: 2900,
    country: "IN",
    region: "Nilgiris, Tamil Nadu",
    description:
      "High-grown orthodox black tea, bright liquor with a brisk finish. Available as whole leaf or broken grade on request.",
    photo: "photo-1563822249366-3efb23b8e0c9",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-08-16T09:00:00.000Z",
    moderationStatus: "verified",
    moderationNote: null,
    moderatedBy: "Priya Nair",
    moderatedAt: "2026-08-17T10:00:00.000Z",
    deletedAt: null,
  },
  {
    id: "demo-pepper-1",
    sellerId: "seller@amama.in",
    sellerName: "Ravi Kumar",
    cropId: "spices",
    variety: "Malabar Black Pepper",
    grade: "Grade A+",
    quantityMt: 10,
    pricePerTonneUsd: 5200,
    country: "IN",
    region: "Wayanad, Kerala",
    description:
      "Garbled Malabar black pepper, 550 g/l bulk density. Sun-dried, hand-cleaned, fumigation certificate available on request.",
    photo: "photo-1508616022737-e97a67b9b26e",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-08-30T09:00:00.000Z",
    moderationStatus: "verified",
    moderationNote: null,
    moderatedBy: "Priya Nair",
    moderatedAt: "2026-08-31T10:00:00.000Z",
    deletedAt: null,
  },
  {
    id: "demo-cashew-1",
    sellerId: "seller@amama.in",
    sellerName: "Ravi Kumar",
    cropId: "cashew",
    variety: "W-320",
    grade: "Grade A",
    quantityMt: 18,
    pricePerTonneUsd: 5300,
    country: "IN",
    region: "Kollam, Kerala",
    description:
      "Steam-processed W-320 cashew kernels, moisture-controlled and aflatoxin-tested. Vacuum-packed in 25lb tins, 10 tins per master carton.",
    photo: "photo-1626697556426-8a55a8af4999",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-09-05T09:00:00.000Z",
    moderationStatus: "verified",
    moderationNote: null,
    moderatedBy: "Priya Nair",
    moderatedAt: "2026-09-06T10:00:00.000Z",
    deletedAt: null,
  },
  {
    id: "demo-rice-1",
    sellerId: "seller@amama.in",
    sellerName: "Ravi Kumar",
    cropId: "grains",
    variety: "Basmati 1121",
    grade: "Grade A+",
    quantityMt: 25,
    pricePerTonneUsd: 950,
    country: "IN",
    region: "Karnal, Haryana",
    description:
      "Extra-long-grain Basmati 1121, aged 12 months for aroma and elongation on cooking. Sortex-cleaned, jute or PP bag packing.",
    photo: "photo-1586201375761-83865001e31c",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-09-12T09:00:00.000Z",
    moderationStatus: "verified",
    moderationNote: null,
    moderatedBy: "Priya Nair",
    moderatedAt: "2026-09-12T14:00:00.000Z",
    deletedAt: null,
  },
]

/** Backfills fields added after some browsers already had listings saved
 *  in `localStorage` — the same one-level merge every other store here
 *  does for exactly this reason. */
function normalize(raw: Partial<Listing>): Listing {
  return {
    moderationStatus: "unverified",
    moderationNote: null,
    moderatedBy: null,
    moderatedAt: null,
    pinX: 50,
    pinY: 50,
    deletedAt: null,
    ...raw,
  } as Listing
}

let snapshot: Listing[] = []
let restored = false
const listeners = new Set<() => void>()
const emptyListings: Listing[] = []

function restoreOnce() {
  if (restored || typeof window === "undefined") return
  restored = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      snapshot = (JSON.parse(raw) as Partial<Listing>[]).map(normalize)
    } else {
      // First visit: seed the store so the localStorage copy and the
      // in-memory one agree from the very first read.
      snapshot = SEED_LISTINGS
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
    }
  } catch {
    // Private mode or blocked storage — carry on with the seed, unsaved.
    snapshot = SEED_LISTINGS
  }
}

function subscribe(listener: () => void) {
  restoreOnce()
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  restoreOnce()
  return snapshot
}

function getServerSnapshot() {
  return emptyListings
}

function write(next: Listing[]) {
  snapshot = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Persistence is best-effort.
  }
  listeners.forEach((listener) => listener())
}

/** Every listing across every seller — a buyer's marketplace and a
 *  seller's own catalog are both just filtered views of this one list. */
function useListings(): Listing[] {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

function addListing(
  input: Omit<
    Listing,
    "id" | "createdAt" | "moderationStatus" | "moderationNote" | "moderatedBy" | "moderatedAt" | "deletedAt"
  >
): Listing {
  restoreOnce()
  const listing: Listing = {
    ...input,
    id: `listing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    // Every new listing goes straight into the marketplace — moderation
    // happens alongside being live, not as a gate in front of it.
    moderationStatus: "unverified",
    moderationNote: null,
    moderatedBy: null,
    moderatedAt: null,
    deletedAt: null,
  }
  write([listing, ...snapshot])
  return listing
}

/** A soft delete — the listing stays in the store (so a buyer's existing
 *  conversation about it still resolves to something real) but drops out
 *  of both the marketplace and the seller's own catalog from here on. */
function softDeleteListing(id: string) {
  restoreOnce()
  write(
    snapshot.map((listing) =>
      listing.id === id ? { ...listing, deletedAt: new Date().toISOString() } : listing
    )
  )
}

/**
 * A seller editing their own listing. Any edit sends it back through
 * moderation — the content changed, so the KAM's earlier sign-off no
 * longer applies to what's actually being shown now. Returns both
 * snapshots (not just the new one) so the caller can log a real before/
 * after into every conversation tied to this product, rather than a bare
 * "listing updated" line nobody can act on.
 */
function updateListing(
  id: string,
  patch: Partial<Omit<Listing, "id" | "sellerId" | "sellerName" | "createdAt">>
): { before: Listing; after: Listing } | null {
  restoreOnce()
  const before = snapshot.find((listing) => listing.id === id)
  if (!before) return null
  const after: Listing = {
    ...before,
    ...patch,
    moderationStatus: "unverified",
    moderationNote: null,
    moderatedBy: null,
    moderatedAt: null,
  }
  write(snapshot.map((listing) => (listing.id === id ? after : listing)))
  return { before, after }
}

/** The KAM console's one write path — verifying a listing or flagging it
 *  out of the marketplace, with an optional note the seller gets to read
 *  on their own copy either way. */
function moderateListing(
  id: string,
  status: ModerationStatus,
  moderatedBy: string,
  note: string | null = null
) {
  restoreOnce()
  write(
    snapshot.map((listing) =>
      listing.id === id
        ? {
            ...listing,
            moderationStatus: status,
            moderationNote: note,
            moderatedBy,
            moderatedAt: new Date().toISOString(),
          }
        : listing
    )
  )
}

export { useListings, addListing, softDeleteListing, updateListing, moderateListing }
