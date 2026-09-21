"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CheckIcon, ClipboardListIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetCloseButton } from "@/components/ui/sheet"
import { formatInr } from "@/features/marketplace/currency"
import { buyerIdentity } from "@/features/marketplace/identity"
import { acceptQuote, rfqsForBuyer, useRfqs, type Rfq, type RfqQuote } from "@/features/marketplace/rfq-store"
import { useOnboarding } from "@/features/onboarding/onboarding-context"

/** `useSearchParams` opts a route out of static rendering unless it sits
 *  under a boundary — same fix already applied to `ContractsView` and
 *  `MessagesView`. */
function BuyerRfqsView() {
  return (
    <React.Suspense fallback={<RfqsSkeleton />}>
      <BuyerRfqsWorkspace />
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

/** A plain, image-free list — same shape as the seller's RFQ list — with
 *  each row opening the full quote comparison in a sheet rather than a
 *  persistent rail-and-detail split: a phone has no room to show a list
 *  next to a detail pane, so this is one drawer, not two screens. */
function BuyerRfqsWorkspace() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { draft } = useOnboarding()
  const buyer = buyerIdentity(draft.buyer)
  const rfqs = useRfqs()

  const mine = React.useMemo(() => rfqsForBuyer(rfqs, buyer.id), [rfqs, buyer.id])
  const selectedId = searchParams.get("rfq")
  const selected = mine.find((entry) => entry.id === selectedId) ?? null

  const setParams = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(next)) {
      if (value === null) params.delete(key)
      else params.set(key, value)
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }
  const openRfq = (id: string) => setParams({ rfq: id })
  const closeSheet = () => setParams({ rfq: null })

  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">RFQs</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Requirements you&apos;ve published to several sellers at once — compare what comes back before you
        commit to one.
      </p>

      {mine.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border px-5 py-16 text-center">
          <ClipboardListIcon className="size-6 text-muted-foreground" />
          <p className="text-[15px] font-semibold">No RFQs yet</p>
          <p className="max-w-sm text-[13px] text-muted-foreground">
            Open a product from the marketplace and use &ldquo;Request quotes (RFQ)&rdquo; to send one
            requirement to several sellers at once.
          </p>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {mine.map((rfq) => (
            <li key={rfq.id}>
              <BuyerRfqListRow rfq={rfq} onSelect={() => openRfq(rfq.id)} />
            </li>
          ))}
        </ul>
      )}

      <Sheet open={selected !== null} onOpenChange={(open) => !open && closeSheet()}>
        <SheetContent side="responsive" className="overflow-y-auto">
          <SheetCloseButton />
          {selected ? <RfqComparison rfq={selected} myName={buyer.name} /> : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}

/** No photo, no card — just the facts a buyer scans an RFQ list for: what,
 *  how much has come back, and whether it's still open. */
function BuyerRfqListRow({ rfq, onSelect }: { rfq: Rfq; onSelect: () => void }) {
  const quotedCount = rfq.quotes.filter((quote) => quote.status !== "withdrawn").length

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-start transition-colors hover:bg-muted"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-foreground">{rfq.title}</p>
        <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
          {rfq.spec.quantityMt ? `${rfq.spec.quantityMt} MT` : "Quantity not set"}
          {rfq.spec.destinationPort ? ` · ${rfq.spec.destinationPort}` : ""}
        </p>
      </div>
      <div className="shrink-0 text-end">
        <p className="text-[12px] font-semibold text-muted-foreground">
          {quotedCount}/{rfq.sellers.length} quoted
        </p>
        <p className="mt-0.5 text-[11px] font-medium text-amama-deep">
          {rfq.status === "open" ? "Open" : rfq.status === "closed" ? "Closed" : "Cancelled"}
        </p>
      </div>
    </button>
  )
}

/** Every seller's quote side by side — the whole point of an RFQ over a
 *  one-on-one negotiation. Sorted cheapest-first so the buyer's eye lands
 *  on the number that matters most without having to scan. A plain
 *  divider list rather than a card per quote, same as everywhere else a
 *  list of comparable records shows up in this app. */
function RfqComparison({ rfq, myName }: { rfq: Rfq; myName: string }) {
  const sorted = [...rfq.quotes]
    .filter((quote) => quote.status !== "withdrawn")
    .sort((a, b) => a.pricePerTonneUsd - b.pricePerTonneUsd)

  return (
    <div className="flex flex-col gap-4 pb-2">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="min-w-0 truncate text-[17px] font-bold tracking-tight text-foreground">{rfq.title}</h2>
          <span className="shrink-0 rounded-full bg-amama-subtle px-2.5 py-1 text-[11px] font-semibold text-amama-deep">
            {rfq.status === "open" ? "Open" : rfq.status === "closed" ? "Closed" : "Cancelled"}
          </span>
        </div>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {rfq.spec.quantityMt ? `${rfq.spec.quantityMt} MT` : "Quantity not set"}
          {rfq.spec.destinationPort ? ` · ${rfq.spec.destinationPort}` : ""}
          {rfq.spec.incoterm ? ` · ${rfq.spec.incoterm}` : ""}
        </p>
        {rfq.spec.notes ? <p className="mt-2 text-[13px] text-muted-foreground">{rfq.spec.notes}</p> : null}
      </div>

      <div>
        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          Quotes {sorted.length > 0 ? `· ${sorted.length}` : ""}
        </p>
        {sorted.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-dashed border-border px-4 py-8 text-center text-[13px] text-muted-foreground">
            No quotes yet — sellers can see this RFQ in their own inbox.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {sorted.map((quote) => (
              <li key={quote.id}>
                <QuoteRow rfq={rfq} quote={quote} myName={myName} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/** Same multicolumn "excel sheet" row shape used across Shipments, Orders
 *  and Contracts — identity on the left, a label/value payment-term
 *  column, a right-aligned total with the accept action beneath it. */
function QuoteRow({ rfq, quote, myName }: { rfq: Rfq; quote: RfqQuote; myName: string }) {
  const total = quote.pricePerTonneUsd * quote.quantityMt
  const canAccept = rfq.status === "open" && quote.status === "submitted"

  return (
    <div className="grid w-full grid-cols-1 items-center gap-3 bg-white px-4 py-4 sm:grid-cols-[1.2fr_0.9fr_1fr]">
      <div className="min-w-0 space-y-1">
        <p className="truncate text-[13px] font-semibold text-foreground">{quote.sellerName}</p>
        <p className="text-[12px] text-muted-foreground">
          {formatInr(quote.pricePerTonneUsd)}/t × {quote.quantityMt} MT
          {quote.incoterm ? ` · ${quote.incoterm}` : ""}
          {quote.deliveryWindow ? ` · ${quote.deliveryWindow}` : ""}
        </p>
      </div>

      <div className="hidden min-w-0 flex-col justify-center text-[12px] sm:flex">
        <span className="text-muted-foreground">Payment</span>
        <span className="truncate font-semibold text-foreground">{quote.paymentTerm ?? "—"}</span>
      </div>

      <div className="flex w-full items-center justify-between gap-3 tabular-nums sm:w-auto sm:flex-col sm:items-end sm:gap-2">
        <span className="text-[14px] font-semibold tracking-tight text-foreground sm:text-[18px]">
          {formatInr(total)}
        </span>
        {canAccept ? (
          <Button size="sm" onClick={() => acceptQuote(rfq.id, quote.id, myName)}>
            <CheckIcon className="size-4" />
            Accept
          </Button>
        ) : quote.status === "accepted" ? (
          <span className="shrink-0 rounded-full bg-amama-deep px-3 py-1 text-[11px] font-semibold text-white">
            Accepted
          </span>
        ) : quote.status === "not-selected" ? (
          <span className="text-[11px] font-medium text-muted-foreground">Not selected</span>
        ) : null}
      </div>
    </div>
  )
}

export { BuyerRfqsView }
