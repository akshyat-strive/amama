"use client"

import * as React from "react"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { CheckIcon, ClipboardListIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { productLabel } from "@/features/marketplace/catalog"
import { formatInr } from "@/features/marketplace/currency"
import { buyerIdentity } from "@/features/marketplace/identity"
import { rfqCropPhoto } from "@/features/marketplace/rfq-feed-card"
import { acceptQuote, rfqsForBuyer, useRfqs, type Rfq, type RfqQuote } from "@/features/marketplace/rfq-store"
import { cropImageUrl } from "@/features/onboarding/steps"
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

function BuyerRfqsWorkspace() {
  const { draft } = useOnboarding()
  const buyer = buyerIdentity(draft.buyer)
  const rfqs = useRfqs()
  const searchParams = useSearchParams()
  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  const mine = React.useMemo(() => rfqsForBuyer(rfqs, buyer.id), [rfqs, buyer.id])
  const requestedId = searchParams.get("rfq")
  const effectiveId =
    selectedId ?? (requestedId && mine.some((entry) => entry.id === requestedId) ? requestedId : mine[0]?.id)
  const selected = mine.find((entry) => entry.id === effectiveId) ?? null

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
        <div className="mt-6 flex flex-col gap-4 lg:flex-row">
          <ul className="flex shrink-0 flex-col gap-2 lg:w-[280px]">
            {mine.map((rfq) => (
              <li key={rfq.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(rfq.id)}
                  aria-current={rfq.id === selected?.id ? "true" : undefined}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-[18px] border p-3 text-start transition-colors",
                    rfq.id === selected?.id
                      ? "border-amama-deep bg-amama-subtle"
                      : "border-border bg-card hover:bg-muted"
                  )}
                >
                  <span className="relative size-11 shrink-0 overflow-hidden rounded-xl">
                    <Image
                      src={cropImageUrl(rfqCropPhoto(rfq.productCategory), 96)}
                      alt={productLabel(rfq.productCategory)}
                      fill
                      sizes="44px"
                      className="object-cover"
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[13px] font-bold leading-snug text-foreground">{rfq.title}</p>
                    <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                      {rfq.quotes.filter((quote) => quote.status !== "withdrawn").length} of {rfq.sellers.length}{" "}
                      quoted
                    </p>
                    <p className="mt-1.5 inline-flex rounded-full bg-card px-2 py-0.5 text-[11px] font-semibold text-amama-deep">
                      {rfq.status === "open" ? "Open" : rfq.status === "closed" ? "Closed" : "Cancelled"}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          <div className="min-w-0 flex-1">{selected ? <RfqComparison rfq={selected} myName={buyer.name} /> : null}</div>
        </div>
      )}
    </div>
  )
}

/** Every seller's quote side by side — the whole point of an RFQ over a
 *  one-on-one negotiation. Sorted cheapest-first so the buyer's eye lands
 *  on the number that matters most without having to scan. */
function RfqComparison({ rfq, myName }: { rfq: Rfq; myName: string }) {
  const sorted = [...rfq.quotes]
    .filter((quote) => quote.status !== "withdrawn")
    .sort((a, b) => a.pricePerTonneUsd - b.pricePerTonneUsd)

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[17px] font-bold tracking-tight">{rfq.title}</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {rfq.spec.quantityMt ? `${rfq.spec.quantityMt} MT` : "Quantity not set"}
              {rfq.spec.destinationPort ? ` · ${rfq.spec.destinationPort}` : ""}
              {rfq.spec.incoterm ? ` · ${rfq.spec.incoterm}` : ""}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-amama-subtle px-3 py-1 text-[12px] font-semibold text-amama-deep">
            {rfq.status === "open" ? "Open" : rfq.status === "closed" ? "Closed" : "Cancelled"}
          </span>
        </div>
        {rfq.spec.notes ? <p className="mt-3 text-[13px] text-muted-foreground">{rfq.spec.notes}</p> : null}
      </section>

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-[13px] text-muted-foreground">
          No quotes yet — sellers can see this RFQ in their own inbox.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((quote) => (
            <QuoteRow key={quote.id} rfq={rfq} quote={quote} myName={myName} />
          ))}
        </div>
      )}
    </div>
  )
}

function QuoteRow({ rfq, quote, myName }: { rfq: Rfq; quote: RfqQuote; myName: string }) {
  const total = quote.pricePerTonneUsd * quote.quantityMt
  const canAccept = rfq.status === "open" && quote.status === "submitted"

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between",
        quote.status === "accepted" ? "border-amama-deep bg-amama-subtle" : "border-border bg-card"
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-amama-subtle text-[12px] font-bold text-amama-deep">
          {quote.sellerName.charAt(0)}
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-foreground">{quote.sellerName}</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {formatInr(quote.pricePerTonneUsd)}/t × {quote.quantityMt} MT · {quote.incoterm ?? "—"}
            {quote.deliveryWindow ? ` · ${quote.deliveryWindow}` : ""}
          </p>
          {quote.paymentTerm ? <p className="mt-0.5 text-[12px] text-muted-foreground">{quote.paymentTerm}</p> : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <p className="text-[16px] font-extrabold text-foreground">{formatInr(total)}</p>
        {canAccept ? (
          <Button size="sm" onClick={() => acceptQuote(rfq.id, quote.id, myName)}>
            <CheckIcon className="size-4" />
            Accept
          </Button>
        ) : quote.status === "accepted" ? (
          <span className="rounded-full bg-amama-deep px-3 py-1 text-[12px] font-semibold text-white">Accepted</span>
        ) : quote.status === "not-selected" ? (
          <span className="text-[12px] font-medium text-muted-foreground">Not selected</span>
        ) : null}
      </div>
    </div>
  )
}

export { BuyerRfqsView }
