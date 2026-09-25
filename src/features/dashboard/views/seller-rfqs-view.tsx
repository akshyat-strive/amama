"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CheckIcon, ClipboardListIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetCloseButton } from "@/components/ui/sheet"
import { PAGE_TABS_SPACE, PageTabs } from "@/features/dashboard/page-tabs"
import { formatInr } from "@/features/marketplace/currency"
import { sellerIdentity } from "@/features/marketplace/identity"
import { useListings } from "@/features/marketplace/listing-store"
import {
  joinRfqAsSeller,
  openRfqsForSellerFeed,
  quoteFromSeller,
  rfqMatchForSeller,
  rfqsForSeller,
  seedRfqsIfEmpty,
  SEED_RFQS,
  useRfqs,
  type Rfq,
  type RfqMatch,
} from "@/features/marketplace/rfq-store"
import { RfqQuoteDialog } from "@/features/marketplace/rfq-quote-dialog"
import { useOnboarding } from "@/features/onboarding/onboarding-context"

type SellerRfqTab = "open" | "sent"

const matchLabels: Record<RfqMatch, string | null> = {
  exact: "Matches your listing",
  category: "Near your catalog",
  none: null,
}

/** `useSearchParams` opts a route out of static rendering unless it sits
 *  under a boundary — same fix already applied elsewhere in this app. */
function SellerRfqsView() {
  return (
    <React.Suspense fallback={<RfqsSkeleton />}>
      <SellerRfqsWorkspace />
    </React.Suspense>
  )
}

function RfqsSkeleton() {
  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">RFQs</h1>
      <div className="mt-6 h-40 animate-pulse rounded-3xl bg-muted" />
    </div>
  )
}

/** Every RFQ this seller has real standing on — invited, or already
 *  quoted — plus a broadened feed of every other open RFQ across the
 *  marketplace, ranked by how closely it matches what they actually sell.
 *  A buyer only ever hand-picks a handful of sellers per RFQ; this is
 *  what lets everyone else who could fill it find it too.
 *
 * A plain, image-free list rather than a card grid — an RFQ is a
 * requirement to scan and compare, not a product to browse — split into
 * two tabs (`?tab=open|sent`) rather than two stacked sections, with the
 * selected row's own id also in the URL (`?rfq=`) so a link to a specific
 * RFQ, or the back button after opening one, both work as expected.
 */
function SellerRfqsWorkspace() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { draft } = useOnboarding()
  const seller = sellerIdentity(draft.seller)
  const rfqs = useRfqs()
  const allListings = useListings()
  const [quoting, setQuoting] = React.useState<{ rfq: Rfq; joinListingId: string | null } | null>(null)

  // Belt-and-suspenders: the app-wide demo seed already covers this (see
  // `seedAdminDemoData`), but that only runs once per browser version and
  // only from the dashboard shell's own effect — if this page is ever
  // reached with the RFQ store genuinely empty (a browser whose seed
  // predates RFQs, or one that got cleared out from under it), this
  // guarantees the seller's own feed still has something real on it
  // rather than a bare "no RFQs" empty state. `seedRfqsIfEmpty` is a
  // no-op once the store already has anything in it.
  React.useEffect(() => {
    seedRfqsIfEmpty(SEED_RFQS)
  }, [])

  const myListings = React.useMemo(
    () => allListings.filter((listing) => listing.sellerId === seller.id && !listing.deletedAt),
    [allListings, seller.id]
  )
  const myCropIds = React.useMemo(() => Array.from(new Set(myListings.map((listing) => listing.cropId))), [myListings])

  const mine = React.useMemo(() => rfqsForSeller(rfqs, seller.id), [rfqs, seller.id])
  const mineIds = React.useMemo(() => new Set(mine.map((rfq) => rfq.id)), [mine])
  const discoverable = React.useMemo(
    () => openRfqsForSellerFeed(rfqs, myCropIds).filter((rfq) => !mineIds.has(rfq.id)),
    [rfqs, myCropIds, mineIds]
  )

  const tab: SellerRfqTab = searchParams.get("tab") === "sent" ? "sent" : "open"
  const visible = tab === "open" ? discoverable : mine
  const selectedId = searchParams.get("rfq")
  const selected = [...mine, ...discoverable].find((rfq) => rfq.id === selectedId) ?? null

  const setParams = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(next)) {
      if (value === null) params.delete(key)
      else params.set(key, value)
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const setTab = (next: SellerRfqTab) => setParams({ tab: next === "open" ? null : next, rfq: null })
  const openRfq = (rfq: Rfq) => setParams({ rfq: rfq.id })
  const closeSheet = () => setParams({ rfq: null })

  const startQuoting = (rfq: Rfq) => {
    const alreadyIn = rfq.sellers.some((entry) => entry.sellerId === seller.id)
    if (alreadyIn) {
      setQuoting({ rfq, joinListingId: null })
      return
    }
    // Not personally invited — joining needs one of this seller's own
    // listings for the RFQ's product so there's a real thing to quote
    // against; the closest catalog match they have is the reasonable
    // default rather than making them pick before they've even seen the
    // quote form.
    const candidate = myListings.find((listing) => listing.cropId === rfq.productCategory) ?? myListings[0] ?? null
    if (!candidate) return
    setQuoting({ rfq, joinListingId: candidate.id })
  }

  if (mine.length === 0 && discoverable.length === 0) {
    return (
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">RFQs</h1>
        <div className="mt-6 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border px-5 py-16 text-center">
          <ClipboardListIcon className="size-6 text-muted-foreground" />
          <p className="text-[15px] font-semibold">No RFQs yet</p>
          <p className="max-w-sm text-[13px] text-muted-foreground">
            When a buyer publishes a requirement, it&apos;ll show up here — the closest match to what you
            sell first.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={PAGE_TABS_SPACE}>
      <h1 className="text-[28px] font-bold tracking-tight">RFQs</h1>

      <PageTabs
        label="RFQ lists"
        className="mt-5"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "open", label: "Open", count: discoverable.length },
          { value: "sent", label: "Invited", count: mine.length },
        ]}
      />

      {visible.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-border px-5 py-10 text-center text-[13px] text-muted-foreground">
          {tab === "open" ? "Nothing else open on the marketplace right now." : "No buyer has sent you an RFQ directly yet."}
        </p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-border rounded-2xl border border-border bg-card">
          {visible.map((rfq) => (
            <li key={rfq.id}>
              <RfqListRow
                rfq={rfq}
                sellerId={seller.id}
                match={tab === "open" ? rfqMatchForSeller(rfq, myCropIds) : undefined}
                onSelect={() => openRfq(rfq)}
              />
            </li>
          ))}
        </ul>
      )}

      <RfqDetailSheet
        rfq={selected}
        sellerId={seller.id}
        onOpenChange={(open) => !open && closeSheet()}
        onQuote={() => selected && startQuoting(selected)}
      />

      {quoting ? (
        <QuotingDialog
          quoting={quoting}
          onOpenChange={(open) => !open && setQuoting(null)}
          sellerId={seller.id}
          sellerName={seller.name}
        />
      ) : null}
    </div>
  )
}

/** One plain row — no photo, no card, just the facts a seller scans an
 *  RFQ list for: what, how much, quoted-so-far, and (on the Open tab)
 *  whether it lines up with their own catalog. */
function RfqListRow({
  rfq,
  sellerId,
  match,
  onSelect,
}: {
  rfq: Rfq
  sellerId: string
  match?: RfqMatch
  onSelect: () => void
}) {
  const quote = quoteFromSeller(rfq, sellerId)
  const matchLabel = match ? matchLabels[match] : null

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-start transition-colors hover:bg-muted"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-foreground">{rfq.title}</p>
        <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
          {rfq.buyerName}
          {rfq.spec.quantityMt ? ` · ${rfq.spec.quantityMt} MT` : ""}
          {rfq.spec.destinationPort ? ` · ${rfq.spec.destinationPort}` : ""}
        </p>
        {matchLabel ? (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amama-subtle px-2 py-0.5 text-[10px] font-semibold text-amama-deep">
            <CheckIcon className="size-2.5" />
            {matchLabel}
          </span>
        ) : null}
      </div>
      <div className="shrink-0 text-end">
        <p className="text-[12px] font-semibold text-muted-foreground">
          {rfq.quotes.filter((q) => q.status !== "withdrawn").length}/{rfq.sellers.length} quoted
        </p>
        {quote && quote.status !== "withdrawn" ? (
          <p className="mt-0.5 text-[11px] font-medium text-amama-deep">
            {quote.status === "accepted" ? "Accepted" : quote.status === "not-selected" ? "Not selected" : "Quoted"}
          </p>
        ) : rfq.status !== "open" ? (
          <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
            {rfq.status === "cancelled" ? "Cancelled" : "Closed"}
          </p>
        ) : null}
      </div>
    </button>
  )
}

/** The detail drawer a row opens into — every spec field a seller needs
 *  to decide whether to quote, plus the one action that matters. Bottom
 *  sheet on a phone, side sheet from `sm` up (`SheetContent`'s own
 *  `side="responsive"`), so this is one drawer, not two screens to build. */
function RfqDetailSheet({
  rfq,
  sellerId,
  onOpenChange,
  onQuote,
}: {
  rfq: Rfq | null
  sellerId: string
  onOpenChange: (open: boolean) => void
  onQuote: () => void
}) {
  const quote = rfq ? quoteFromSeller(rfq, sellerId) : null
  const canQuote = !!rfq && rfq.status === "open" && (!quote || quote.status === "withdrawn")

  return (
    <Sheet open={rfq !== null} onOpenChange={onOpenChange}>
      <SheetContent side="responsive" className="overflow-y-auto">
        <SheetCloseButton />
        {rfq ? (
          <div className="flex flex-col gap-4 pb-2">
            <div>
              <h2 className="text-[17px] font-bold tracking-tight text-foreground">{rfq.title}</h2>
              <p className="mt-1 text-[13px] text-muted-foreground">{rfq.buyerName}</p>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl bg-muted p-4 text-[13px]">
              <RfqSpecField label="Quantity" value={rfq.spec.quantityMt ? `${rfq.spec.quantityMt} MT` : null} />
              <RfqSpecField label="Variety" value={rfq.spec.variety} />
              <RfqSpecField label="Grade" value={rfq.spec.grade} />
              <RfqSpecField label="Packaging" value={rfq.spec.packaging} />
              <RfqSpecField label="Container" value={rfq.spec.containerType} />
              <RfqSpecField label="Destination" value={rfq.spec.destinationPort} />
              <RfqSpecField label="Incoterm" value={rfq.spec.incoterm} />
              <RfqSpecField
                label="Shipping window"
                value={
                  rfq.spec.shippingWindowFrom || rfq.spec.shippingWindowTo
                    ? `${rfq.spec.shippingWindowFrom ?? "…"} → ${rfq.spec.shippingWindowTo ?? "…"}`
                    : null
                }
              />
              <RfqSpecField label="Payment ask" value={rfq.spec.paymentTermPreference} />
              <RfqSpecField label="Monthly volume" value={rfq.spec.monthlyVolumeMt ? `${rfq.spec.monthlyVolumeMt} MT` : null} />
            </dl>

            {rfq.spec.notes ? (
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Notes</p>
                <p className="mt-1 text-[13px] leading-relaxed text-foreground">{rfq.spec.notes}</p>
              </div>
            ) : null}

            <div className="mt-1 border-t border-border pt-4">
              {quote && quote.status !== "withdrawn" ? (
                <p className="rounded-2xl bg-muted px-4 py-3 text-[13px] font-semibold text-foreground">
                  Your quote: {formatInr(quote.pricePerTonneUsd)}/t ·{" "}
                  {quote.status === "accepted" ? "accepted" : quote.status === "not-selected" ? "not selected" : "awaiting decision"}
                </p>
              ) : null}
              {canQuote ? (
                <Button className="w-full" onClick={onQuote}>
                  {quote ? "Requote" : "Submit a quote"}
                </Button>
              ) : !quote ? (
                <p className="text-center text-[13px] font-medium text-muted-foreground">
                  {rfq.status === "cancelled" ? "This RFQ was cancelled." : "This RFQ has closed."}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function RfqSpecField({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-0.5 truncate font-medium text-foreground">{value}</dd>
    </div>
  )
}

/** Joins the seller onto the RFQ (if they weren't already a target) the
 *  moment the dialog actually opens, then hands off to the ordinary quote
 *  form — a seller who was already invited skips straight there. */
function QuotingDialog({
  quoting,
  onOpenChange,
  sellerId,
  sellerName,
}: {
  quoting: { rfq: Rfq; joinListingId: string | null }
  onOpenChange: (open: boolean) => void
  sellerId: string
  sellerName: string
}) {
  const listings = useListings()
  React.useEffect(() => {
    if (!quoting.joinListingId) return
    const listing = listings.find((entry) => entry.id === quoting.joinListingId)
    if (!listing) return
    joinRfqAsSeller(quoting.rfq.id, {
      sellerId,
      sellerName,
      listingId: listing.id,
      listingTitle: listing.variety ? `${listing.variety} — ${listing.grade}` : listing.grade,
    })
    // Runs once, right when a not-yet-invited seller opens the dialog —
    // re-running on every render would re-check an already-idempotent
    // join, but there's no reason to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <RfqQuoteDialog open onOpenChange={onOpenChange} rfq={quoting.rfq} sellerId={sellerId} sellerName={sellerName} />
  )
}

export { SellerRfqsView }
