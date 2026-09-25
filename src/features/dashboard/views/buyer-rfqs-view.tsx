"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CheckIcon, ClipboardListIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
          {selected ? <RfqComparison key={selected.id} rfq={selected} myName={buyer.name} /> : null}
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

const STATUS_LABEL: Record<Rfq["status"], string> = { open: "Open", closed: "Closed", cancelled: "Cancelled" }

/** The sheet is for reading and choosing, not for firing actions from
 *  every row: quotes are a single-choice list, and the one decision the
 *  buyer can make here sits in the footer, behind a confirmation — because
 *  accepting one quote closes the RFQ for every other seller. */
function RfqComparison({ rfq, myName }: { rfq: Rfq; myName: string }) {
  const sorted = [...rfq.quotes]
    .filter((quote) => quote.status !== "withdrawn")
    .sort((a, b) => a.pricePerTonneUsd - b.pricePerTonneUsd)
  const accepted = sorted.find((quote) => quote.status === "accepted") ?? null
  const decidable = rfq.status === "open" && !accepted
  const [selectedId, setSelectedId] = React.useState<string | null>(decidable ? (sorted[0]?.id ?? null) : null)
  const [confirming, setConfirming] = React.useState(false)
  const selected = sorted.find((quote) => quote.id === selectedId) ?? null
  const others = sorted.filter((quote) => quote.id !== selectedId && quote.status === "submitted").length

  const facts = [
    { label: "Quantity", value: rfq.spec.quantityMt ? `${rfq.spec.quantityMt} MT` : null },
    { label: "Destination", value: rfq.spec.destinationPort },
    { label: "Incoterm", value: rfq.spec.incoterm },
    { label: "Payment ask", value: rfq.spec.paymentTermPreference },
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact.value))

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div>
        <div className="flex items-start justify-between gap-3 pe-8">
          <h2 className="min-w-0 text-[17px] font-bold tracking-tight text-foreground">{rfq.title}</h2>
          <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-foreground">
            {STATUS_LABEL[rfq.status]}
          </span>
        </div>
        {facts.length > 0 ? (
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
            {facts.map((fact) => (
              <div key={fact.label} className="min-w-0">
                <dt className="text-[11.5px] text-muted-foreground">{fact.label}</dt>
                <dd className="truncate text-[13px] font-semibold text-foreground">{fact.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>

      <div>
        <p className="text-[12px] font-medium text-muted-foreground">
          Quotes{sorted.length > 0 ? ` · ${sorted.length}` : ""}
        </p>
        {sorted.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-dashed border-border px-4 py-8 text-center text-[13px] text-muted-foreground">
            No quotes yet
          </p>
        ) : (
          <div
            role={decidable ? "radiogroup" : "list"}
            aria-label="Quotes"
            className="mt-2 flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card"
          >
            {sorted.map((quote, index) => (
              <QuoteRow
                key={quote.id}
                quote={quote}
                lowest={index === 0 && sorted.length > 1}
                selectable={decidable && quote.status === "submitted"}
                selected={quote.id === selectedId}
                onSelect={() => setSelectedId(quote.id)}
              />
            ))}
          </div>
        )}
      </div>

      {decidable && sorted.length > 0 ? (
        <div className="sticky bottom-0 -mx-4 mt-auto -mb-4 border-t border-border bg-popover px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[12px] text-muted-foreground">{selected ? selected.sellerName : "Pick a quote"}</p>
              <p className="text-[15px] font-semibold text-foreground tabular-nums">
                {selected ? formatInr(selected.pricePerTonneUsd * selected.quantityMt) : "—"}
              </p>
            </div>
            <Button disabled={!selected} onClick={() => setConfirming(true)}>
              Accept
            </Button>
          </div>
        </div>
      ) : null}

      {selected ? (
        <Dialog open={confirming} onOpenChange={setConfirming}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Accept {selected.sellerName}&apos;s quote?</DialogTitle>
              <DialogDescription>
                This closes the RFQ.{" "}
                {others > 0 ? `${others} other quote${others === 1 ? "" : "s"} will be marked not selected.` : null}
              </DialogDescription>
            </DialogHeader>
            <dl className="divide-y divide-border rounded-2xl border border-border text-[13px]">
              {[
                { label: "Price", value: `${formatInr(selected.pricePerTonneUsd)} / t` },
                { label: "Quantity", value: `${selected.quantityMt} MT` },
                { label: "Total", value: formatInr(selected.pricePerTonneUsd * selected.quantityMt) },
                { label: "Incoterm", value: selected.incoterm ?? "—" },
                { label: "Payment", value: selected.paymentTerm ?? "—" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="font-semibold text-foreground tabular-nums">{row.value}</dd>
                </div>
              ))}
            </dl>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  acceptQuote(rfq.id, selected.id, myName)
                  setConfirming(false)
                }}
              >
                <CheckIcon className="size-4" />
                Accept quote
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  )
}

const QUOTE_STATE: Partial<Record<RfqQuote["status"], { label: string; className: string }>> = {
  accepted: { label: "Accepted", className: "bg-amama-subtle text-amama-deep" },
  "not-selected": { label: "Not selected", className: "bg-muted text-muted-foreground" },
}

/** One quote. When the RFQ is still open the whole row is the choice
 *  (a radio), never a button of its own. */
function QuoteRow({
  quote,
  lowest,
  selectable,
  selected,
  onSelect,
}: {
  quote: RfqQuote
  lowest: boolean
  selectable: boolean
  selected: boolean
  onSelect: () => void
}) {
  const total = quote.pricePerTonneUsd * quote.quantityMt
  const state = QUOTE_STATE[quote.status]
  const body = (
    <>
      {selectable ? (
        <span
          aria-hidden
          className={cn(
            "grid size-4 shrink-0 place-items-center rounded-full border",
            selected ? "border-foreground bg-foreground" : "border-border"
          )}
        >
          {selected ? <span className="size-1.5 rounded-full bg-background" /> : null}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[13.5px] font-semibold text-foreground">{quote.sellerName}</span>
          {lowest ? (
            <span className="shrink-0 rounded-full bg-amama-subtle px-1.5 py-0.5 text-[10.5px] font-semibold text-amama-deep">
              Best rate
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block truncate text-[12px] text-muted-foreground tabular-nums">
          {formatInr(quote.pricePerTonneUsd)}/t · {quote.quantityMt} MT
          {quote.incoterm ? ` · ${quote.incoterm}` : ""}
          {quote.paymentTerm ? ` · ${quote.paymentTerm}` : ""}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-[14px] font-semibold text-foreground tabular-nums">{formatInr(total)}</span>
        {state ? (
          <span className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-semibold", state.className)}>{state.label}</span>
        ) : null}
      </span>
    </>
  )

  if (!selectable) {
    return (
      <div role="listitem" className="flex items-center gap-3 px-4 py-3.5">
        {body}
      </div>
    )
  }
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3.5 text-start transition-colors",
        selected ? "bg-muted" : "hover:bg-muted/60"
      )}
    >
      {body}
    </button>
  )
}

export { BuyerRfqsView }
