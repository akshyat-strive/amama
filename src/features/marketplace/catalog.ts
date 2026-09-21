import {
  AppleIcon,
  CarrotIcon,
  CoffeeIcon,
  FlameIcon,
  LayersIcon,
  NutIcon,
  ShirtIcon,
  WheatIcon,
  type LucideIcon,
} from "lucide-react"

import { cropLabels } from "@/features/dashboard/demo-data"
import { crops } from "@/features/onboarding/steps"

export type CatalogCategoryId =
  | "fruits"
  | "plantation"
  | "spices"
  | "grains-pulses"
  | "nuts-oilseeds"
  | "vegetables"
  | "cash-crops"
  | "other"

export type CatalogCategory = {
  id: CatalogCategoryId
  label: string
  icon: LucideIcon
  /** A representative crop photo (an `images.unsplash.com/photo-*` id) for
   *  this category's own tile/rail item — categories aren't real products,
   *  so this just stands in for "what this grouping generally looks like".
   *  `null` for `other`, which falls back to its icon instead. */
  photo: string | null
  /** The base `cropId`s (from `onboarding/steps.ts`'s canonical `crops`
   *  list, plus any marketplace-only product like `banana` that never went
   *  through onboarding) that ship pre-assigned to this category. Any
   *  `cropId` outside every category's list here (a seller's future custom
   *  product) still gets its own real `categoryId` at creation time — this
   *  array is only the starting map used to backfill listings saved before
   *  categories existed, via `categoryForCropId`. */
  cropIds: string[]
}

function photoFor(cropId: string): string {
  return crops.find((crop) => crop.id === cropId)?.photo ?? crops[0].photo
}

/**
 * The marketplace's top browse layer. Eight categories is enough to place
 * every crop `onboarding/steps.ts` already knows about, plus `other` as the
 * catch-all a brand-new custom product falls into if nothing more specific
 * fits — never a closed set that blocks a seller from listing something the
 * app hasn't seen before.
 */
export const CATALOG_CATEGORIES: CatalogCategory[] = [
  {
    id: "fruits",
    label: "Fruits",
    icon: AppleIcon,
    photo: photoFor("apple"),
    cropIds: ["apple", "banana", "fresh-fruit", "dried-fruit"],
  },
  {
    id: "plantation",
    label: "Plantation & Beverage Crops",
    icon: CoffeeIcon,
    photo: photoFor("coffee"),
    cropIds: ["coffee", "cocoa", "tea"],
  },
  { id: "spices", label: "Spices", icon: FlameIcon, photo: photoFor("spices"), cropIds: ["spices"] },
  {
    id: "grains-pulses",
    label: "Grains & Pulses",
    icon: WheatIcon,
    photo: photoFor("grains"),
    cropIds: ["grains", "pulses"],
  },
  {
    id: "nuts-oilseeds",
    label: "Nuts & Oilseeds",
    icon: NutIcon,
    photo: photoFor("cashew"),
    cropIds: ["cashew", "nuts", "sesame", "oils"],
  },
  {
    id: "vegetables",
    label: "Vegetables",
    icon: CarrotIcon,
    photo: photoFor("vegetables"),
    cropIds: ["vegetables"],
  },
  {
    id: "cash-crops",
    label: "Fibre & Cash Crops",
    icon: ShirtIcon,
    photo: photoFor("cotton"),
    cropIds: ["cotton", "sugar"],
  },
  { id: "other", label: "Other", icon: LayersIcon, photo: null, cropIds: [] },
]

const CROP_TO_CATEGORY = new Map<string, CatalogCategoryId>(
  CATALOG_CATEGORIES.flatMap((category) => category.cropIds.map((cropId) => [cropId, category.id] as const))
)

/** Only ever used as a **backfill default** for a listing saved before
 *  `categoryId` existed — every listing created from here on carries the
 *  category the seller actually picked. Falls back to `"other"` for
 *  anything not in the base map (a custom product from before this
 *  backfill ran even once). */
export function categoryForCropId(cropId: string): CatalogCategoryId {
  return CROP_TO_CATEGORY.get(cropId) ?? "other"
}

export function catalogCategory(id: string): CatalogCategory {
  return CATALOG_CATEGORIES.find((category) => category.id === id) ?? CATALOG_CATEGORIES[CATALOG_CATEGORIES.length - 1]
}

function titleCase(text: string): string {
  return text
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

/** The one place "what do we call this product" is decided — `cropLabels`
 *  for anything on the fixed list, a title-cased read of the id itself for
 *  a seller's custom product (a slugified id with no dictionary entry),
 *  rather than every call site inventing its own fallback. */
export function productLabel(cropId: string): string {
  return cropLabels[cropId] ?? titleCase(cropId)
}

/** Turns free text into a URL-safe, comparison-safe key — used both for a
 *  variant's route segment and for grouping listings whose seller typed
 *  the same variety with different casing/whitespace ("Kashmiri Apple" vs
 *  "kashmiri  apple") into one tile instead of two. */
export function slugify(text: string): string {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug || "variant"
}

/** A product name typed as a new `cropId` — de-duplicated against whatever
 *  `cropId`s are already in use, the same way a filename picker avoids
 *  clobbering an existing file. */
export function uniqueProductId(label: string, existingIds: Iterable<string>): string {
  const base = slugify(label)
  const taken = new Set(existingIds)
  if (!taken.has(base)) return base
  let suffix = 2
  while (taken.has(`${base}-${suffix}`)) suffix += 1
  return `${base}-${suffix}`
}
