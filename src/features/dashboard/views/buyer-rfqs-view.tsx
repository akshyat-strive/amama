"use client"

import * as React from "react"
import { CheckIcon, ClipboardListIcon, MessageSquareIcon, SendIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

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
import { ColumnCard } from "@/components/ui/column-card"
import { DetailPage, useDetailRoute } from "@/components/ui/detail-page"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { postCard, startConversation } from "@/features/marketplace/conversation-store"
import { RfqRequirement } from "@/features/marketplace/rfq-requirement"
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
    <ColumnCard title="RFQs">
      <div className="h-40 animate-pulse rounded-[16px] bg-muted" />
    </ColumnCard>
  )
}

/** A plain, image-free list — same shape as the seller's RFQ list — with
 *  each row opening the full quote comparison in a sheet rather than a
 *  persistent rail-and-detail split: a phone has no room to show a list
 *  next to a detail pane, so this is one drawer, not two screens. */
function BuyerRfqsWorkspace() {
  const { draft } = useOnboarding()
  const buyer = buyerIdentity(draft.buyer)
  const rfqs = useRfqs()
  const detail = useDetailRoute({ segment: "rfqId", query: "rfq" })

  const mine = React.useMemo(() => rfqsForBuyer(rfqs, buyer.id), [rfqs, buyer.id])
  const selected = mine.find((entry) => entry.id === detail.selectedId) ?? null
  const openRfq = detail.open

  if (selected) {
    return (
      <DetailPage
        backLabel="RFQs"
        onBack={detail.close}
        trail={["RFQs", selected.title]}
        status={<span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-foreground">{STATUS_LABEL[selected.status]}</span>}
      >
        <RfqComparison key={selected.id} rfq={selected} myName={buyer.name} />
      </DetailPage>
    )
  }

  return (
    <ColumnCard title="RFQs">
      {mine.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[20px] bg-card px-5 py-16 text-center">
          <ClipboardListIcon className="size-6 text-muted-foreground" />
          <p className="text-[15px] font-semibold">No RFQs yet</p>
          <p className="max-w-sm text-[13px] text-muted-foreground">
            Open a product from the marketplace and use &ldquo;Request quotes (RFQ)&rdquo; to send one
            requirement to several sellers at once.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col">
          {mine.map((rfq) => (
            <li key={rfq.id}>
              <BuyerRfqListRow rfq={rfq} onSelect={() => openRfq(rfq.id)} />
            </li>
          ))}
        </ul>
      )}
    </ColumnCard>
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
      className="chat-row flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-start transition-colors [--row-inset:0.75rem] hover:bg-card"
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

  return (
    <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-5">
      <RfqRequirement rfq={rfq} className="lg:sticky lg:top-0 lg:order-last lg:self-start" />

      <div className="flex min-w-0 flex-col gap-3">
        <section aria-label="Quotations" className="rounded-[20px] bg-card p-1.5">
          <p className="px-2.5 pt-2 pb-2 text-[14px] font-semibold text-foreground">
            Quotations{sorted.length > 0 ? ` · ${sorted.length}` : ""}
          </p>
          {sorted.length === 0 ? (
            <p className="rounded-[14px] bg-background px-4 py-8 text-center text-[13px] text-muted-foreground">
              No quotes yet
            </p>
          ) : (
            <div
              role={decidable ? "radiogroup" : "list"}
              aria-label="Quotations"
              className="flex flex-col divide-inset overflow-hidden rounded-[14px] bg-background"
            >
              {sorted.map((quote, index) => (
                <QuoteRow
                  key={quote.id}
                  rfq={rfq}
                  quote={quote}
                  lowest={index === 0 && sorted.length > 1}
                  selectable={decidable && quote.status === "submitted"}
                  selected={quote.id === selectedId}
                  onSelect={() => setSelectedId(quote.id)}
                />
              ))}
            </div>
          )}
        </section>

      {decidable && sorted.length > 0 ? (
        <div className="sticky bottom-0 -mx-3 mt-auto -mb-3 border-t border-border bg-background px-3 py-3 sm:-mx-4 sm:px-4 lg:me-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[12px] text-muted-foreground">{selected ? selected.sellerName : "Pick a quote"}</p>
              <p className="text-[15px] font-semibold text-foreground tabular-nums">
                {selected ? formatInr(selected.pricePerTonneUsd * selected.quantityMt) : "—"}
              </p>
            </div>
            <Button disabled={!selected} onClick={() => setConfirming(true)} className="rounded-xl">
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
            <dl className="divide-inset rounded-2xl border border-border text-[13px]">
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
    </div>
  )
}

const QUOTE_STATE: Partial<Record<RfqQuote["status"], { label: string; className: string }>> = {
  accepted: { label: "Accepted", className: "bg-amama-subtle text-amama-deep" },
  "not-selected": { label: "Not selected", className: "bg-muted text-muted-foreground" },
}

const QUESTION_CHIPS = [
  "Can you improve the price?",
  "Can you deliver sooner?",
  "Can you split the quantity?",
  "Can you confirm the grade and packaging?",
]

/** Asks the seller about this one quote. It lands as a card in the same
 *  thread their quote card already lives in (the one the RFQ opened for
 *  them), so the answer comes back right beside the numbers it's about. */
function MessageSellerButton({ rfq, quote }: { rfq: Rfq; quote: RfqQuote }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [text, setText] = React.useState("")
  const target = rfq.sellers.find((entry) => entry.sellerId === quote.sellerId)
  if (!target) return null

  const send = () => {
    const question = text.trim()
    if (!question) return
    // Idempotent: finds the RFQ thread with this seller, or opens one.
    const id = startConversation({
      buyerId: rfq.buyerId,
      buyerName: rfq.buyerName,
      sellerId: target.sellerId,
      sellerName: target.sellerName,
      listingId: target.listingId,
      listingTitle: target.listingTitle,
      openingMessage: `${rfq.buyerName} sent an RFQ: "${rfq.title}".`,
    })
    postCard({
      conversationId: id,
      from: "buyer",
      fromName: rfq.buyerName,
      text: `${rfq.buyerName} asked about your RFQ quote: ${question}`,
      card: { kind: "quote-question", rfqId: rfq.id, quoteId: quote.id, question, askedAt: new Date().toISOString() },
    })
    setOpen(false)
    setText("")
    toast.success(`Question sent to ${quote.sellerName}`, {
      action: { label: "Open chat", onClick: () => router.push(`/buyer/dashboard/messages?conversation=${encodeURIComponent(id)}`) },
    })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <PopoverTrigger
          render={
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-label={`Message ${quote.sellerName}`}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-[12.5px] font-medium text-foreground/75 transition-colors hover:bg-muted hover:text-foreground sm:px-3"
                >
                  <MessageSquareIcon aria-hidden className="size-4" />
                  <span className="hidden lg:inline">Message seller</span>
                </button>
              }
            />
          }
        />
        <TooltipContent side="top">Message seller</TooltipContent>
      </Tooltip>
      <PopoverContent side="bottom" align="end" className="w-[min(22rem,calc(100vw-2rem))]">
        <p className="text-[13.5px] font-semibold text-foreground">Ask {quote.sellerName}</p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {QUESTION_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setText(chip)}
              className="rounded-full bg-muted px-2.5 py-1 text-[12px] font-medium text-foreground transition-colors hover:bg-muted/70"
            >
              {chip}
            </button>
          ))}
        </div>
        <Textarea
          rows={3}
          aria-label="Your question"
          placeholder="Write your question about this quote…"
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="mt-2.5"
        />
        <Button size="sm" disabled={!text.trim()} onClick={send} className="mt-2.5 w-full rounded-xl">
          <SendIcon className="size-3.5 rtl:-scale-x-100" />
          Send
        </Button>
      </PopoverContent>
    </Popover>
  )
}

/** One quote. When the RFQ is still open the whole row is the choice
 *  (a radio), never a button of its own — the message action sits beside
 *  it, not inside it. */
function QuoteRow({
  rfq,
  quote,
  lowest,
  selectable,
  selected,
  onSelect,
}: {
  rfq: Rfq
  quote: RfqQuote
  lowest: boolean
  selectable: boolean
  selected: boolean
  onSelect: () => void
}) {
  const total = quote.pricePerTonneUsd * quote.quantityMt
  const state = QUOTE_STATE[quote.status]
  const canMessage = rfq.status === "open" && quote.status === "submitted"
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

  return (
    <div role={selectable ? "none" : "listitem"} className={cn("flex items-center gap-1 pe-2", selected && "bg-muted")}>
      {selectable ? (
        <button
          type="button"
          role="radio"
          aria-checked={selected}
          onClick={onSelect}
          className={cn("flex min-w-0 flex-1 items-center gap-3 py-3 ps-4 pe-2 text-start transition-colors", !selected && "hover:bg-muted/60")}
        >
          {body}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3 py-3 ps-4 pe-2">{body}</div>
      )}
      {canMessage ? <MessageSellerButton rfq={rfq} quote={quote} /> : null}
    </div>
  )
}

export { BuyerRfqsView }
