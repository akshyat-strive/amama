"use client"

import * as React from "react"

import { categoryForCropId } from "@/features/marketplace/catalog"

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
  /** The marketplace's top browse layer — one of `catalog.ts`'s
   *  `CatalogCategoryId`s, kept as a plain string here the same way
   *  `cropId` already is rather than importing that union type. */
  categoryId: string
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
// `categoryId` deliberately omitted from every seed row — `normalize()`
// (below) backfills it from each row's own `cropId` via
// `categoryForCropId`, the same way a real browser's pre-existing
// `localStorage` listings get it, rather than hand-tagging all 14 of these.
const SEED_LISTINGS: Omit<Listing, "categoryId">[] = [
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
    id: "seed-11",
    sellerId: "seed-kinnaur-greens",
    sellerName: "Kinnaur Green Orchards",
    cropId: "apple",
    variety: "Kinnaur Green Apple",
    grade: "Grade A",
    quantityMt: 20,
    pricePerTonneUsd: 860,
    country: "IN",
    region: "Kinnaur, Himachal Pradesh",
    description:
      "Tart, crisp green apples grown at high altitude for firmness that holds through a long transit. Hand-picked, waxed, 18kg export cartons.",
    photo: "photo-1560951016-1242fd973c7f",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-08-21T09:00:00.000Z",
    moderationStatus: "verified",
    moderationNote: null,
    moderatedBy: "Priya Nair",
    moderatedAt: "2026-08-22T10:00:00.000Z",
    deletedAt: null,
  },
  {
    id: "seed-12",
    sellerId: "seed-nagpur-delicious",
    sellerName: "Himalayan Delicious Apple Traders",
    cropId: "apple",
    variety: "Himachal Red Delicious",
    grade: "Grade A+",
    quantityMt: 28,
    pricePerTonneUsd: 990,
    country: "IN",
    region: "Kotgarh, Himachal Pradesh",
    description:
      "Deep-red Delicious apples with a dense, sweet bite — sized 175–200g, hand-sorted for colour uniformity. CA-stored, waxed and export-packed.",
    photo: "photo-1619546813926-a78fa6372cd2",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-08-23T09:00:00.000Z",
    moderationStatus: "unverified",
    moderationNote: null,
    moderatedBy: null,
    moderatedAt: null,
    deletedAt: null,
  },
  {
    id: "seed-13",
    sellerId: "seed-kullu-fuji",
    sellerName: "Kullu Valley Fuji Growers",
    cropId: "apple",
    variety: "Kullu Fuji Apple",
    grade: "Grade A+",
    quantityMt: 22,
    pricePerTonneUsd: 1020,
    country: "IN",
    region: "Kullu, Himachal Pradesh",
    description:
      "Honey-crisp Fuji apples, high sugar content from long, cool ripening in the valley. Sorted by Brix, individually cushioned in export trays.",
    photo: "photo-1600752085601-1ec2646cd736",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-08-24T09:00:00.000Z",
    moderationStatus: "verified",
    moderationNote: null,
    moderatedBy: "Priya Nair",
    moderatedAt: "2026-08-25T10:00:00.000Z",
    deletedAt: null,
  },
  {
    id: "seed-14",
    sellerId: "seed-jalgaon-banana",
    sellerName: "Jalgaon Banana Growers Cooperative",
    cropId: "banana",
    variety: "Jalgaon Robusta Banana",
    grade: "Grade A",
    quantityMt: 45,
    pricePerTonneUsd: 380,
    country: "IN",
    region: "Jalgaon, Maharashtra",
    description:
      "Tissue-culture Robusta bananas, uniform finger size and green-life managed for a 3-week transit window. Carton-packed, 13kg net.",
    photo: "photo-1587132137056-bfbf0166836e",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-09-13T09:00:00.000Z",
    moderationStatus: "verified",
    moderationNote: null,
    moderatedBy: "Priya Nair",
    moderatedAt: "2026-09-14T10:00:00.000Z",
    deletedAt: null,
  },
  {
    id: "seed-15",
    sellerId: "seed-kerala-nendran",
    sellerName: "Kerala Nendran Banana Farmers",
    cropId: "banana",
    variety: "Kerala Nendran Banana",
    grade: "Grade A+",
    quantityMt: 30,
    pricePerTonneUsd: 420,
    country: "IN",
    region: "Thrissur, Kerala",
    description:
      "Nendran plantain-bananas, harvested at 75% maturity for export ripening on arrival. Hand-cut hands, foam-netted to prevent bruising.",
    photo: "photo-1528825871115-3581a5387919",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-09-14T09:00:00.000Z",
    moderationStatus: "verified",
    moderationNote: null,
    moderatedBy: "Priya Nair",
    moderatedAt: "2026-09-15T10:00:00.000Z",
    deletedAt: null,
  },
  {
    id: "seed-16",
    sellerId: "seed-tn-yelakki",
    sellerName: "Tamil Nadu Yelakki Growers",
    cropId: "banana",
    variety: "Tamil Nadu Yelakki Banana",
    grade: "Grade A",
    quantityMt: 18,
    pricePerTonneUsd: 560,
    country: "IN",
    region: "Erode, Tamil Nadu",
    description:
      "Small-fingered Yelakki (Elaichi) bananas, prized for sweetness and aroma. Sorted by hand, 12kg ventilated cartons for the Gulf trade.",
    photo: "photo-1571771894821-ce9b6c11b08e",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-09-15T09:00:00.000Z",
    moderationStatus: "unverified",
    moderationNote: null,
    moderatedBy: null,
    moderatedAt: null,
    deletedAt: null,
  },
  {
    id: "seed-17",
    sellerId: "seed-ap-red-banana",
    sellerName: "Andhra Red Banana Exporters",
    cropId: "banana",
    variety: "Andhra Red Banana",
    grade: "Grade A",
    quantityMt: 15,
    pricePerTonneUsd: 640,
    country: "IN",
    region: "Anantapur, Andhra Pradesh",
    description:
      "Red Banana (Chenkadali), thin-skinned with a creamy, slightly tangy pulp. Limited volume, cut to order, cushioned single-layer cartons.",
    photo: "photo-1603833665858-e61d17a86224",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-09-16T09:00:00.000Z",
    moderationStatus: "verified",
    moderationNote: null,
    moderatedBy: "Priya Nair",
    moderatedAt: "2026-09-17T10:00:00.000Z",
    deletedAt: null,
  },
  {
    id: "seed-18",
    sellerId: "seed-idukki-criollo",
    sellerName: "Idukki Criollo Cocoa Farmers",
    cropId: "cocoa",
    variety: "Idukki Criollo Cocoa",
    grade: "Grade A+",
    quantityMt: 12,
    pricePerTonneUsd: 2900,
    country: "IN",
    region: "Idukki, Kerala",
    description:
      "Fine-flavour Criollo cocoa beans, fully fermented (6 days) and sun-dried to 7% moisture. Low acidity, prized by craft chocolate makers.",
    photo: "photo-1493925410384-84f842e616fb",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-09-18T09:00:00.000Z",
    moderationStatus: "verified",
    moderationNote: null,
    moderatedBy: "Priya Nair",
    moderatedAt: "2026-09-19T10:00:00.000Z",
    deletedAt: null,
  },
  {
    id: "seed-19",
    sellerId: "seed-wayanad-forastero",
    sellerName: "Wayanad Forastero Growers",
    cropId: "cocoa",
    variety: "Wayanad Forastero Cocoa",
    grade: "Grade A",
    quantityMt: 16,
    pricePerTonneUsd: 2500,
    country: "IN",
    region: "Wayanad, Kerala",
    description:
      "Bulk Forastero cocoa beans, bold and disease-resistant. Box-fermented, sun-dried, jute-bagged in 60kg sacks for industrial buyers.",
    photo: "photo-1493925410384-84f842e616fb",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-09-18T09:00:00.000Z",
    moderationStatus: "unverified",
    moderationNote: null,
    moderatedBy: null,
    moderatedAt: null,
    deletedAt: null,
  },
  {
    id: "seed-20",
    sellerId: "seed-chikmagalur-robusta",
    sellerName: "Chikmagalur Robusta Growers",
    cropId: "coffee",
    variety: "Chikmagalur Robusta",
    grade: "Grade A",
    quantityMt: 30,
    pricePerTonneUsd: 2600,
    country: "IN",
    region: "Chikmagalur, Karnataka",
    description:
      "Washed Robusta, full-bodied with a bold, earthy cup — the workhorse blend base for espresso and instant coffee alike. Full traceability to estate.",
    photo: "photo-1447933601403-0c6688de566e",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-09-19T09:00:00.000Z",
    moderationStatus: "verified",
    moderationNote: null,
    moderatedBy: "Priya Nair",
    moderatedAt: "2026-09-20T10:00:00.000Z",
    deletedAt: null,
  },
  {
    id: "seed-21",
    sellerId: "seed-assam-ctc",
    sellerName: "Assam Valley Tea Estate",
    cropId: "tea",
    variety: "Assam Orthodox CTC",
    grade: "Grade A",
    quantityMt: 22,
    pricePerTonneUsd: 2400,
    country: "IN",
    region: "Dibrugarh, Assam",
    description:
      "Strong, malty Assam CTC, bright coppery liquor built for milk tea. Available in whole-leaf orthodox or classic CTC grain on request.",
    photo: "photo-1563822249366-3efb23b8e0c9",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-09-19T09:00:00.000Z",
    moderationStatus: "verified",
    moderationNote: null,
    moderatedBy: "Priya Nair",
    moderatedAt: "2026-09-20T10:00:00.000Z",
    deletedAt: null,
  },
  {
    id: "seed-22",
    sellerId: "seed-alleppey-turmeric",
    sellerName: "Alleppey Turmeric Cooperative",
    cropId: "spices",
    variety: "Alleppey Finger Turmeric",
    grade: "Grade A+",
    quantityMt: 14,
    pricePerTonneUsd: 2100,
    country: "IN",
    region: "Alleppey, Kerala",
    description:
      "High-curcumin (5%+) Alleppey finger turmeric, steam-cleaned and polished. The benchmark grade Gulf and European spice buyers ask for by name.",
    photo: "photo-1583949885751-23b7d1909378",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-09-20T09:00:00.000Z",
    moderationStatus: "verified",
    moderationNote: null,
    moderatedBy: "Priya Nair",
    moderatedAt: "2026-09-21T10:00:00.000Z",
    deletedAt: null,
  },
  {
    id: "seed-23",
    sellerId: "seed-idukki-cardamom",
    sellerName: "Idukki Cardamom Hills Estate",
    cropId: "spices",
    variety: "Idukki Green Cardamom (8mm)",
    grade: "Grade A+",
    quantityMt: 6,
    pricePerTonneUsd: 14500,
    country: "IN",
    region: "Idukki, Kerala",
    description:
      "Bold 8mm green cardamom, hand-picked and flue-cured to lock in the oil. Auction-graded, moisture-sealed in laminated bags.",
    photo: "photo-1642255521852-7e7c742ac58f",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-09-20T09:00:00.000Z",
    moderationStatus: "unverified",
    moderationNote: null,
    moderatedBy: null,
    moderatedAt: null,
    deletedAt: null,
  },
  {
    id: "seed-24",
    sellerId: "seed-guntur-chilli",
    sellerName: "Guntur Sannam Chilli Traders",
    cropId: "spices",
    variety: "Guntur Sannam Chilli",
    grade: "Grade A",
    quantityMt: 20,
    pricePerTonneUsd: 2200,
    country: "IN",
    region: "Guntur, Andhra Pradesh",
    description:
      "Deep-red Sannam S4 dried chillies, high colour value (ASTA 90+), medium heat. Stem-removed, sun-dried, packed in 25kg woven bags.",
    photo: "photo-1602237514002-c2d8ae2da393",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-09-21T09:00:00.000Z",
    moderationStatus: "verified",
    moderationNote: null,
    moderatedBy: "Priya Nair",
    moderatedAt: "2026-09-22T10:00:00.000Z",
    deletedAt: null,
  },
  {
    id: "seed-25",
    sellerId: "seed-sona-masoori",
    sellerName: "Andhra Sona Masoori Rice Mills",
    cropId: "grains",
    variety: "Sona Masoori Rice",
    grade: "Grade A",
    quantityMt: 40,
    pricePerTonneUsd: 480,
    country: "IN",
    region: "Nellore, Andhra Pradesh",
    description:
      "Lightweight, aromatic Sona Masoori raw rice — the everyday staple grade for South Indian and Gulf retail. Sortex-cleaned, 5% broken max.",
    photo: "photo-1595444042058-f038c7e0e778",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-09-21T09:00:00.000Z",
    moderationStatus: "verified",
    moderationNote: null,
    moderatedBy: "Priya Nair",
    moderatedAt: "2026-09-22T10:00:00.000Z",
    deletedAt: null,
  },
  {
    id: "seed-26",
    sellerId: "seed-toor-dal",
    sellerName: "Latur Toor Dal Millers",
    cropId: "pulses",
    variety: "Toor Dal (Arhar)",
    grade: "Grade A",
    quantityMt: 25,
    pricePerTonneUsd: 950,
    country: "IN",
    region: "Latur, Maharashtra",
    description:
      "Polished toor dal (split pigeon pea), machine-sorted for uniform size and colour. Vacuum-fumigated, 50kg PP bags or bulk container.",
    photo: "photo-1612257416648-ee7a6c533b4f",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-09-22T09:00:00.000Z",
    moderationStatus: "verified",
    moderationNote: null,
    moderatedBy: "Priya Nair",
    moderatedAt: "2026-09-23T10:00:00.000Z",
    deletedAt: null,
  },
  {
    id: "seed-27",
    sellerId: "seed-chana-dal",
    sellerName: "Madhya Pradesh Chana Dal Traders",
    cropId: "pulses",
    variety: "Chana Dal",
    grade: "Grade A",
    quantityMt: 30,
    pricePerTonneUsd: 720,
    country: "IN",
    region: "Indore, Madhya Pradesh",
    description:
      "Split, de-husked chana dal (Bengal gram), sortex-cleaned. A staple pulse for the diaspora and food-processing trade alike.",
    photo: "photo-1612257416648-ee7a6c533b4f",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-09-22T09:00:00.000Z",
    moderationStatus: "unverified",
    moderationNote: null,
    moderatedBy: null,
    moderatedAt: null,
    deletedAt: null,
  },
  {
    id: "seed-28",
    sellerId: "seed-w180-cashew",
    sellerName: "Kollam W-180 Cashew Exporters",
    cropId: "cashew",
    variety: "W-180 Jumbo",
    grade: "Grade A+",
    quantityMt: 14,
    pricePerTonneUsd: 6800,
    country: "IN",
    region: "Kollam, Kerala",
    description:
      "The largest wholes graded (fewer than 180 kernels/lb) — the premium jumbo grade for gifting tins and premium retail packs.",
    photo: "photo-1626697556426-8a55a8af4999",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-09-23T09:00:00.000Z",
    moderationStatus: "verified",
    moderationNote: null,
    moderatedBy: "Priya Nair",
    moderatedAt: "2026-09-24T10:00:00.000Z",
    deletedAt: null,
  },
  {
    id: "seed-29",
    sellerId: "seed-kashmir-almond",
    sellerName: "Kashmir Almond Growers Association",
    cropId: "nuts",
    variety: "Kashmir Mamra Almond",
    grade: "Grade A+",
    quantityMt: 10,
    pricePerTonneUsd: 8200,
    country: "IN",
    region: "Srinagar, Jammu & Kashmir",
    description:
      "Wrinkled-shell Mamra almonds, dense and oil-rich — the premium Kashmiri varietal. Sun-dried, hand-shelled, moisture under 5%.",
    photo: "photo-1631815333332-e3ffb24e2bf8",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-09-23T09:00:00.000Z",
    moderationStatus: "verified",
    moderationNote: null,
    moderatedBy: "Priya Nair",
    moderatedAt: "2026-09-24T10:00:00.000Z",
    deletedAt: null,
  },
  {
    id: "seed-30",
    sellerId: "seed-groundnut-oil",
    sellerName: "Saurashtra Cold-Press Oil Mills",
    cropId: "oils",
    variety: "Cold-Pressed Groundnut Oil",
    grade: "Grade A",
    quantityMt: 18,
    pricePerTonneUsd: 1350,
    country: "IN",
    region: "Rajkot, Gujarat",
    description:
      "Wood cold-pressed (kachi ghani) groundnut oil, unrefined and additive-free. Filled in food-grade drums or bulk flexitanks.",
    photo: "photo-1474979266404-7eaacbcd87c5",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-09-24T09:00:00.000Z",
    moderationStatus: "verified",
    moderationNote: null,
    moderatedBy: "Priya Nair",
    moderatedAt: "2026-09-25T10:00:00.000Z",
    deletedAt: null,
  },
  {
    id: "seed-31",
    sellerId: "seed-mustard-oil",
    sellerName: "Bharatpur Mustard Oil Traders",
    cropId: "oils",
    variety: "Cold-Pressed Mustard Oil",
    grade: "Grade A",
    quantityMt: 15,
    pricePerTonneUsd: 1150,
    country: "IN",
    region: "Bharatpur, Rajasthan",
    description:
      "Pungent kachi ghani mustard oil, double-filtered. A staple cooking and pickling oil across North India and the diaspora trade.",
    photo: "photo-1474979266404-7eaacbcd87c5",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-09-24T09:00:00.000Z",
    moderationStatus: "unverified",
    moderationNote: null,
    moderatedBy: null,
    moderatedAt: null,
    deletedAt: null,
  },
  {
    id: "seed-32",
    sellerId: "seed-nashik-onion",
    sellerName: "Nashik Red Onion Growers",
    cropId: "vegetables",
    variety: "Nashik Red Onion",
    grade: "Grade A",
    quantityMt: 50,
    pricePerTonneUsd: 350,
    country: "IN",
    region: "Nashik, Maharashtra",
    description:
      "Firm, deep-red export onions, 45–70mm sizing, single-layer sun-cured for a longer shelf life. Mesh-bagged, 25kg or bulk.",
    photo: "photo-1585849834908-3481231155e8",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-09-25T09:00:00.000Z",
    moderationStatus: "verified",
    moderationNote: null,
    moderatedBy: "Priya Nair",
    moderatedAt: "2026-09-26T10:00:00.000Z",
    deletedAt: null,
  },
  {
    id: "seed-33",
    sellerId: "seed-ooty-potato",
    sellerName: "Ooty Highland Potato Farmers",
    cropId: "vegetables",
    variety: "Ooty Hill Potato",
    grade: "Grade A",
    quantityMt: 35,
    pricePerTonneUsd: 300,
    country: "IN",
    region: "Ooty, Tamil Nadu",
    description:
      "Cold-climate table potatoes, low sugar content for a cleaner fry colour. Graded 50–80mm, cold-stored, jute or mesh packing.",
    photo: "photo-1518977676601-b53f82aba655",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-09-25T09:00:00.000Z",
    moderationStatus: "unverified",
    moderationNote: null,
    moderatedBy: null,
    moderatedAt: null,
    deletedAt: null,
  },
  {
    id: "seed-34",
    sellerId: "seed-nagpur-tomato",
    sellerName: "Nagpur Fresh Tomato Growers",
    cropId: "vegetables",
    variety: "Nagpur Hybrid Tomato",
    grade: "Grade A",
    quantityMt: 28,
    pricePerTonneUsd: 380,
    country: "IN",
    region: "Nagpur, Maharashtra",
    description:
      "Firm, thick-skinned hybrid tomatoes bred for transit — holds colour and firmness through a multi-day reefer haul. Carton-packed, single layer.",
    photo: "photo-1607305387299-a3d9611cd469",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-09-26T09:00:00.000Z",
    moderationStatus: "verified",
    moderationNote: null,
    moderatedBy: "Priya Nair",
    moderatedAt: "2026-09-27T10:00:00.000Z",
    deletedAt: null,
  },
  {
    id: "seed-35",
    sellerId: "seed-shankar6-cotton",
    sellerName: "Gujarat Shankar-6 Cotton Traders",
    cropId: "cotton",
    variety: "Shankar-6 Cotton",
    grade: "Grade A",
    quantityMt: 60,
    pricePerTonneUsd: 1650,
    country: "IN",
    region: "Rajkot, Gujarat",
    description:
      "Medium-staple Shankar-6 raw cotton, machine-picked and ginned to 28mm+ staple length. Baled to international density standards.",
    photo: "photo-1616431101491-554c0932ea40",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-09-26T09:00:00.000Z",
    moderationStatus: "verified",
    moderationNote: null,
    moderatedBy: "Priya Nair",
    moderatedAt: "2026-09-27T10:00:00.000Z",
    deletedAt: null,
  },
  {
    id: "seed-36",
    sellerId: "seed-suvin-cotton",
    sellerName: "Coimbatore Suvin Cotton Cooperative",
    cropId: "cotton",
    variety: "Suvin Extra-Long Staple Cotton",
    grade: "Grade A+",
    quantityMt: 22,
    pricePerTonneUsd: 2400,
    country: "IN",
    region: "Coimbatore, Tamil Nadu",
    description:
      "Extra-long staple (35mm+) Suvin cotton, the premium fibre for fine-count yarn. Hand-picked, low trash content, press-baled.",
    photo: "photo-1616431101491-554c0932ea40",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-09-27T09:00:00.000Z",
    moderationStatus: "unverified",
    moderationNote: null,
    moderatedBy: null,
    moderatedAt: null,
    deletedAt: null,
  },
  {
    id: "seed-37",
    sellerId: "seed-kolhapur-jaggery",
    sellerName: "Kolhapur Jaggery Cooperative",
    cropId: "sugar",
    variety: "Kolhapur Jaggery Block",
    grade: "Grade A",
    quantityMt: 20,
    pricePerTonneUsd: 620,
    country: "IN",
    region: "Kolhapur, Maharashtra",
    description:
      "Traditional open-pan jaggery blocks, made from fresh cane juice with no chemical clarifiers. A staple sweetener across South Asian retail.",
    photo: "photo-1559477882-f1a7c5931735",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-09-27T09:00:00.000Z",
    moderationStatus: "verified",
    moderationNote: null,
    moderatedBy: "Priya Nair",
    moderatedAt: "2026-09-28T10:00:00.000Z",
    deletedAt: null,
  },
  {
    id: "seed-38",
    sellerId: "seed-icumsa45-sugar",
    sellerName: "Uttar Pradesh White Sugar Mills",
    cropId: "sugar",
    variety: "ICUMSA 45 White Sugar",
    grade: "Grade A+",
    quantityMt: 45,
    pricePerTonneUsd: 480,
    country: "IN",
    region: "Meerut, Uttar Pradesh",
    description:
      "Refined ICUMSA 45 white sugar, fine crystal, food-grade. Bagged in 50kg PP or bulk container to buyer's specification.",
    photo: "photo-1553747069-aefa5a5c9bad",
    pinX: 50,
    pinY: 50,
    createdAt: "2026-09-28T09:00:00.000Z",
    moderationStatus: "unverified",
    moderationNote: null,
    moderatedBy: null,
    moderatedAt: null,
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
 *  does for exactly this reason. `categoryId` in particular only exists
 *  going forward (the seller picks it in the listing form) — anything
 *  saved before that gets a best-guess category derived from its own
 *  `cropId` instead. */
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
    categoryId: raw.categoryId ?? categoryForCropId(raw.cropId ?? ""),
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
      // in-memory one agree from the very first read. Routed through
      // `normalize()` too, same as the localStorage branch — the seed rows
      // don't carry `categoryId` themselves, so this is what backfills it
      // rather than needing every one of them hand-tagged.
      snapshot = SEED_LISTINGS.map(normalize)
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
    }
  } catch {
    // Private mode or blocked storage — carry on with the seed, unsaved.
    snapshot = SEED_LISTINGS.map(normalize)
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
