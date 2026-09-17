/**
 * Static, indicative exchange rates — not a live feed, since there's no
 * FX API wired up. Good enough to turn "I want ₹66,000 a tonne" into a
 * sensible starting USD price without a seller having to do the maths
 * themselves; a real build would swap `rate` for a live rate lookup
 * without touching anything that calls these.
 */
export const currencies = [
  { code: "USD", label: "US Dollar", rate: 1 },
  { code: "INR", label: "Indian Rupee", rate: 83 },
  { code: "AED", label: "UAE Dirham", rate: 3.67 },
  { code: "VND", label: "Vietnamese Dong", rate: 24500 },
  { code: "ETB", label: "Ethiopian Birr", rate: 118 },
  { code: "LKR", label: "Sri Lankan Rupee", rate: 300 },
  { code: "GHS", label: "Ghanaian Cedi", rate: 15 },
  { code: "EUR", label: "Euro", rate: 0.92 },
  { code: "GBP", label: "British Pound", rate: 0.79 },
] as const

export type CurrencyCode = (typeof currencies)[number]["code"]

export function convertToUsd(amount: number, code: string): number {
  const currency = currencies.find((entry) => entry.code === code)
  if (!currency || !Number.isFinite(amount)) return 0
  return amount / currency.rate
}

const INR_RATE = currencies.find((entry) => entry.code === "INR")!.rate

/** Every price in the app is stored in USD internally (see `Listing`,
 *  `Deal`) — these two convert between that canonical figure and the
 *  rupees a person actually reads or types, using the same indicative
 *  rate as the currency picker above. */
export function usdToInr(usdAmount: number): number {
  return usdAmount * INR_RATE
}

export function inrToUsd(inrAmount: number): number {
  return inrAmount / INR_RATE
}

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
})

/** Formats an amount already denominated in rupees — for the rare spot
 *  (a negotiation dialog) that works in rupees the whole way through. */
export function formatRupees(amount: number): string {
  return inrFormatter.format(amount)
}

/** The one display formatter for every USD-denominated amount stored in
 *  the app — replaces what used to be a `formatUsd` redefined in a dozen
 *  files. */
export function formatInr(usdAmount: number): string {
  return formatRupees(usdToInr(usdAmount))
}

/** Rounds to a number a price list actually looks like — the nearest 50
 *  above a thousand, the nearest 10 below it — rather than handing back
 *  something like $812.36. */
export function suggestRoundedUsd(amount: number): number {
  if (amount >= 1000) return Math.round(amount / 50) * 50
  if (amount >= 100) return Math.round(amount / 10) * 10
  return Math.max(1, Math.round(amount))
}
