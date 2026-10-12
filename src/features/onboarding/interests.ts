import { CATALOG_CATEGORIES, productLabel, slugify } from "@/features/marketplace/catalog"
import type { Listing } from "@/features/marketplace/listing-store"
import { gradesFor } from "@/features/onboarding/steps"
import type { BuyerDraft } from "@/features/onboarding/types"

export type InterestKind = "category" | "product" | "variant" | "grade"

/** One step of a breadcrumb — itself something the buyer can pick. */
export type InterestSegment = { kind: InterestKind; key: string; label: string }

/**
 * Anything a buyer can be interested in, as the breadcrumb that leads to
 * it: `Nuts & Oilseeds › Cashew › W-240`. The last segment is the node
 * itself; every earlier one is a broader pick the same row offers.
 */
export type InterestNode = InterestSegment & {
  path: InterestSegment[]
  /** Shown after the path, e.g. "Any product" for a grade on its own. */
  note?: string
}

const ANY_PRODUCT_GRADES = ["Grade A+", "Grade A", "Grade B", "Grade C"]

export const gradeKey = (productId: string, grade: string) => `${productId}::${grade}`

const segment = (kind: InterestKind, key: string, label: string): InterestSegment => ({ kind, key, label })

/**
 * Every category, product, variant and grade worth suggesting: the
 * catalog, whatever sellers actually list (their custom products and
 * varieties included), and anything this buyer typed in themselves.
 */
export function buildInterestIndex(listings: Listing[], buyer: BuyerDraft, nameOf: (productId: string) => string): InterestNode[] {
  const live = listings.filter((listing) => !listing.deletedAt && listing.moderationStatus !== "flagged")
  const preferences = buyer.preferences

  // Product id → its category, and the categories that exist at all.
  const productCategory = new Map<string, string>()
  const categoryLabel = new Map<string, string>()
  for (const category of CATALOG_CATEGORIES) {
    categoryLabel.set(category.id, category.label)
    for (const cropId of category.cropIds) productCategory.set(cropId, category.id)
  }
  for (const listing of live) if (!productCategory.has(listing.cropId)) productCategory.set(listing.cropId, listing.categoryId)
  const customProducts = [...buyer.sourcing, ...preferences.products.filter((id) => !id.includes("/"))]
  for (const id of customProducts) if (!productCategory.has(id)) productCategory.set(id, "other")
  for (const id of preferences.categories) if (!categoryLabel.has(id)) categoryLabel.set(id, productLabel(id))

  const nodes: InterestNode[] = []
  const categoryHasProducts = new Set(productCategory.values())

  // A category holding a single product of the same name ("Spices ›
  // Spices") reads as one thing, so the product stands in for both.
  const collapsed = new Set<string>()
  for (const [categoryId, label] of categoryLabel) {
    const products = [...productCategory].filter(([, category]) => category === categoryId).map(([id]) => id)
    if (products.length === 1 && nameOf(products[0]).toLowerCase() === label.toLowerCase()) collapsed.add(categoryId)
  }

  for (const [categoryId, label] of categoryLabel) {
    if (collapsed.has(categoryId)) continue
    if (categoryId === "other" && !categoryHasProducts.has("other")) continue
    const self = segment("category", `category:${categoryId}`, label)
    nodes.push({ ...self, path: [self] })
  }

  const varieties = new Map<string, Map<string, string>>()
  const listedGrades = new Map<string, Set<string>>()
  for (const listing of live) {
    if (listing.variety) {
      const byProduct = varieties.get(listing.cropId) ?? new Map<string, string>()
      byProduct.set(slugify(listing.variety), listing.variety)
      varieties.set(listing.cropId, byProduct)
    }
    if (listing.grade) listedGrades.set(listing.cropId, (listedGrades.get(listing.cropId) ?? new Set()).add(listing.grade))
  }
  const scopedGrades = new Map<string, Set<string>>()
  for (const grade of preferences.grades) {
    const [productId, name] = grade.split("::")
    if (name) scopedGrades.set(productId, (scopedGrades.get(productId) ?? new Set()).add(name))
  }

  for (const [productId, categoryId] of productCategory) {
    const product = segment("product", `product:${productId}`, nameOf(productId))
    const trail = collapsed.has(categoryId)
      ? [product]
      : [segment("category", `category:${categoryId}`, categoryLabel.get(categoryId) ?? productLabel(categoryId)), product]
    nodes.push({ ...product, path: trail })

    // Trade grades like "W-240" are often typed as the variety, too — one
    // row is enough, and the marketplace matches a grade against both.
    const grades = new Set([...gradesFor(productId), ...(listedGrades.get(productId) ?? []), ...(scopedGrades.get(productId) ?? [])])
    const gradeNames = new Set([...grades].map((grade) => grade.toLowerCase()))
    for (const [slug, variety] of varieties.get(productId) ?? []) {
      if (gradeNames.has(variety.toLowerCase())) continue
      const self = segment("variant", `variant:${productId}/${slug}`, variety)
      nodes.push({ ...self, path: [...trail, self] })
    }
    for (const grade of grades) {
      const self = segment("grade", `grade:${gradeKey(productId, grade)}`, grade)
      nodes.push({ ...self, path: [...trail, self] })
    }
  }

  const bareGrades = new Set([...ANY_PRODUCT_GRADES, ...preferences.grades.filter((grade) => !grade.includes("::"))])
  for (const grade of bareGrades) {
    const self = segment("grade", `grade:${grade}`, grade)
    nodes.push({ ...self, path: [self], note: "Any product" })
  }

  return nodes
}

const DEPTH: Record<InterestKind, number> = { category: 0, product: 1, variant: 2, grade: 3 }

/** Every node whose breadcrumb contains all the typed words, closest
 *  matches first: the node's own name starting with the query beats a
 *  match further up its path, and broader picks beat narrower ones. */
export function searchInterests(nodes: InterestNode[], query: string, limit = 12): InterestNode[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return []
  const words = needle.split(/\s+/)
  const scored: { node: InterestNode; score: number }[] = []
  for (const node of nodes) {
    const haystack = [...node.path.map((step) => step.label), node.note ?? ""].join(" ").toLowerCase()
    if (!words.every((word) => haystack.includes(word))) continue
    const own = node.label.toLowerCase()
    const score = (own === needle ? 8 : 0) + (own.startsWith(needle) ? 4 : 0) + (own.includes(needle) ? 2 : 0) - DEPTH[node.kind] * 0.5
    scored.push({ node, score })
  }
  return scored
    .sort((a, b) => b.score - a.score || a.node.path.length - b.node.path.length || a.node.label.localeCompare(b.node.label))
    .slice(0, limit)
    .map((entry) => entry.node)
}

/** True when the typed text already names something in the index — no
 *  need to offer adding it as new. */
export function namesExisting(nodes: InterestNode[], query: string) {
  const needle = query.trim().toLowerCase()
  return nodes.some((node) => node.label.toLowerCase() === needle)
}

/** Every key this buyer has picked, in the order they were stored. */
export function pickedKeys(buyer: BuyerDraft): string[] {
  const { categories, products, grades } = buyer.preferences
  return [
    ...categories.map((id) => `category:${id}`),
    ...[...new Set([...buyer.sourcing, ...products.filter((id) => !id.includes("/"))])].map((id) => `product:${id}`),
    ...products.filter((id) => id.includes("/")).map((id) => `variant:${id}`),
    ...grades.map((grade) => `grade:${grade}`),
  ]
}

/** A short name for one picked key, without needing the full index —
 *  "Cashew W-240", "Kashmiri apple", "Grade A". */
export function pickLabel(key: string, nameOf: (productId: string) => string): string {
  const [kind, ...rest] = key.split(":")
  const id = rest.join(":")
  if (kind === "category") return CATALOG_CATEGORIES.find((category) => category.id === id)?.label ?? productLabel(id)
  if (kind === "product") return nameOf(id)
  if (kind === "variant") {
    const [productId, variant] = id.split("/")
    return `${productLabel(variant)} ${nameOf(productId).toLowerCase()}`
  }
  const [productId, grade] = id.split("::")
  return grade ? `${nameOf(productId)} ${grade}` : id
}

/** The draft change that picks or un-picks one key. */
export function togglePick(buyer: BuyerDraft, key: string): Partial<BuyerDraft> {
  const [kind, ...rest] = key.split(":")
  const id = rest.join(":")
  const flip = (list: string[]) => (list.includes(id) ? list.filter((entry) => entry !== id) : [...list, id])
  const preferences = buyer.preferences

  if (kind === "category") return { preferences: { ...preferences, categories: flip(preferences.categories) } }
  if (kind === "variant") return { preferences: { ...preferences, products: flip(preferences.products) } }
  if (kind === "grade") return { preferences: { ...preferences, grades: flip(preferences.grades) } }
  // A product may sit in either list (older drafts kept some in
  // `preferences.products`); un-picking clears both.
  const picked = buyer.sourcing.includes(id) || preferences.products.includes(id)
  return picked
    ? { sourcing: buyer.sourcing.filter((entry) => entry !== id), preferences: { ...preferences, products: preferences.products.filter((entry) => entry !== id) } }
    : { sourcing: [...buyer.sourcing, id] }
}
