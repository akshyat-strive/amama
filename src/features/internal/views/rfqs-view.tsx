"use client"

import * as React from "react"
import Link from "next/link"
import {
  ChevronRightIcon,
  FileTextIcon,
  ImageIcon,
  PaperclipIcon,
  ScrollTextIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { EntityLink } from "@/features/internal/entity-link"
import {
  Dot,
  EmptyState,
  Eyebrow,
  Facts,
  Group,
  Island,
  Metric,
  Metrics,
  Mono,
  PageHead,
  Pill,
  Row,
  Rows,
  Timeline,
  type Tone,
} from "@/features/internal/tower-ui"
import * as W from "@/features/tradechain/demo-world"

/**
 * An RFQ is the first record in the chain, and everything downstream —
 * quote, term sheet, PO, trade, and eventually a sealed container at a
 * terminal — inherits the specification written here. So the detail
 * screen gives the spec its own island rather than burying it in a field
 * row, and keeps the commercial ask, the compliance ask and the seller
 * responses in three separate groups: they are answered by three
 * different people.
 */

const STATUS_TONE: Record<W.RfqStatus, Tone> = {
  open: "brand",
  quoting: "warn",
  awarded: "ok",
  lost: "muted",
  expired: "muted",
}

const QUOTE_TONE: Record<W.QuoteStatus, Tone> = {
  accepted: "ok",
  shortlisted: "brand",
  submitted: "warn",
  "not-selected": "muted",
  withdrawn: "muted",
}

const INVITE_TONE: Record<W.RfqInvitation["state"], Tone> = {
  quoted: "ok",
  declined: "crit",
  "no-response": "warn",
  invited: "muted",
}

const ATTACHMENT_ICON = { spec: FileTextIcon, document: PaperclipIcon, photo: ImageIcon } as const

const day = (value: string): string =>
  new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))

const stamp = (value: string): string =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  }).format(new Date(value))

const money = (value: number, currency: string): string =>
  `${currency} ${value.toLocaleString("en-US")}`

/** Hours left against the demo's frozen clock. Negative means overdue. */
const hoursLeft = (iso: string): number =>
  (new Date(iso).getTime() - new Date(W.NOW).getTime()) / 3_600_000

const isLive = (rfq: W.Rfq): boolean => rfq.status === "open" || rfq.status === "quoting"

/** The response clock. Only meaningful while an RFQ is still live — on a
 *  closed one the status pill already says everything, and repeating it
 *  here just doubles the same word on screen. */
function deadlineLabel(rfq: W.Rfq): { text: string; tone: Tone } | null {
  if (!isLive(rfq)) return null
  const hours = hoursLeft(rfq.respondBy)
  if (hours < 0) return { text: `Overdue ${Math.abs(Math.round(hours))}h`, tone: "crit" }
  if (hours < 24) return { text: `${Math.round(hours)}h left`, tone: "crit" }
  return { text: `${Math.round(hours / 24)}d left`, tone: hours < 72 ? "warn" : "muted" }
}

/* ══════════════════════════════════════════════════════════════════════
   LIST
   ══════════════════════════════════════════════════════════════════════ */

function RfqsView() {
  const rfqs = React.useMemo(
    () => [...W.RFQS].sort((a, b) => b.raisedAt.localeCompare(a.raisedAt)),
    []
  )

  const live = rfqs.filter((rfq) => rfq.status === "open" || rfq.status === "quoting")
  const closed = rfqs.filter((rfq) => rfq.status !== "open" && rfq.status !== "quoting")
  const awaiting = W.RFQS.reduce(
    (sum, rfq) => sum + rfq.invitations.filter((invite) => invite.state === "invited").length,
    0
  )
  const urgent = live.filter((rfq) => hoursLeft(rfq.respondBy) < 24).length

  return (
    <>
      <PageHead title="RFQs" />

      <Metrics>
        <Metric label="Live" value={live.length} tone="brand" />
        <Metric label="Closing today" value={urgent} tone={urgent > 0 ? "crit" : "plain"} />
        <Metric label="Quotes received" value={W.QUOTES.length} />
        <Metric label="Growers not responded" value={awaiting} tone={awaiting > 0 ? "warn" : "plain"} />
        <Metric label="Awarded" value={rfqs.filter((rfq) => rfq.status === "awarded").length} tone="plain" />
      </Metrics>

      <Group label="Live" count={live.length} pad="tight">
        <Rows>
          {live.map((rfq) => (
            <RfqRow key={rfq.id} rfq={rfq} />
          ))}
        </Rows>
      </Group>

      <Group label="Closed" count={closed.length} pad="tight">
        <Rows>
          {closed.map((rfq) => (
            <RfqRow key={rfq.id} rfq={rfq} />
          ))}
        </Rows>
      </Group>
    </>
  )
}

function RfqRow({ rfq }: { rfq: W.Rfq }) {
  const buyer = W.buyerById(rfq.buyerId)
  const variant = W.variantById(rfq.variantId)
  const quotes = W.quotesForRfq(rfq.id)
  const deadline = deadlineLabel(rfq)

  return (
    <Link
      href={`/internal/rfqs/${rfq.id}`}
      className="flex items-center gap-3 rounded-[18px] px-3 py-2.5 transition-colors hover:bg-muted"
    >
      <Dot tone={STATUS_TONE[rfq.status]} />

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <Mono className="font-semibold">{rfq.id}</Mono>
          {rfq.revision > 1 ? <Pill tone="muted">rev {rfq.revision}</Pill> : null}
          <span className="truncate text-[13px] text-foreground">{buyer?.company}</span>
        </span>
        <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
          {variant?.label} · {rfq.qtyMt} MT · {rfq.incoterm} · {day(rfq.deliveryWindow[0])} → {day(rfq.deliveryWindow[1])}
        </span>
      </span>

      <span className="hidden w-24 shrink-0 text-end sm:block">
        <span className="block text-[12px] font-medium tabular-nums">{quotes.length}</span>
        <span className="block text-[11px] text-muted-foreground">quotes</span>
      </span>

      {deadline ? (
        <Pill tone={deadline.tone} className="hidden sm:inline-flex">
          {deadline.text}
        </Pill>
      ) : (
        <Pill tone={STATUS_TONE[rfq.status]} className="hidden sm:inline-flex">
          {rfq.status}
        </Pill>
      )}

      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   DETAIL
   ══════════════════════════════════════════════════════════════════════ */

function RfqDetailView({ rfqId }: { rfqId: string }) {
  const rfq = W.rfqById(rfqId)

  if (!rfq) {
    return (
      <Island>
        <EmptyState icon={ScrollTextIcon} title="RFQ not found" />
      </Island>
    )
  }

  const buyer = W.buyerById(rfq.buyerId)
  const product = W.productById(rfq.productId)
  const variant = W.variantById(rfq.variantId)
  const quotes = [...W.quotesForRfq(rfq.id)].sort((a, b) => a.priceUsdPerMt - b.priceUsdPerMt)
  const deadline = deadlineLabel(rfq)
  const conversation = W.CONVERSATIONS.find((thread) => thread.rfqId === rfq.id)
  const termSheet = W.TERM_SHEETS.find((sheet) => sheet.rfqId === rfq.id)
  const best = quotes[0]

  return (
    <>
      <div className="px-1">
        <Link
          href="/internal/rfqs"
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground"
        >
          RFQs
        </Link>
      </div>

      <PageHead
        title={rfq.id}
        meta={
          <>
            <Pill tone={STATUS_TONE[rfq.status]}>{rfq.status}</Pill>
            {deadline ? <Pill tone={deadline.tone}>{deadline.text}</Pill> : null}
            {rfq.revision > 1 ? <Pill tone="muted">revision {rfq.revision}</Pill> : null}
          </>
        }
      />

      <Metrics>
        <Metric label="Quantity" value={rfq.qtyMt} unit="MT" foot={`± ${rfq.qtyTolerancePct}% tolerance`} />
        <Metric
          label="Target price"
          value={rfq.targetPriceUsdPerMt ? rfq.targetPriceUsdPerMt.toLocaleString("en-US") : "Not disclosed"}
          unit={rfq.targetPriceUsdPerMt ? `${rfq.currency}/MT` : undefined}
        />
        <Metric
          label="Best quote"
          value={best ? best.priceUsdPerMt.toLocaleString("en-US") : "—"}
          unit={best ? "USD/MT" : undefined}
          tone={best && rfq.targetPriceUsdPerMt && best.priceUsdPerMt > rfq.targetPriceUsdPerMt ? "warn" : "brand"}
          foot={best ? W.sellerById(best.sellerId)?.entity : undefined}
        />
        <Metric label="Quotes" value={quotes.length} foot={`${rfq.invitations.length} invited`} />
      </Metrics>

      <div className="grid gap-5 lg:grid-cols-2">
        <Group label="Buyer">
          <Facts
            columns={1}
            rows={[
              { label: "Company", value: <EntityLink kind="buyer" id={rfq.buyerId} mono={false} /> },
              { label: "Contact", value: buyer?.contact ?? "—" },
              { label: "Their reference", value: <Mono>{rfq.buyerReference}</Mono> },
              { label: "Account manager", value: <EntityLink kind="user" id={rfq.kamId} mono={false} /> },
              {
                label: "KYC",
                value: (
                  <Pill tone={buyer?.kyc === "verified" ? "ok" : buyer?.kyc === "missing" ? "crit" : "warn"}>
                    {buyer?.kyc ?? "unknown"}
                  </Pill>
                ),
              },
            ]}
          />
        </Group>

        <Group label="Commercial terms">
          <Facts
            columns={1}
            rows={[
              { label: "Incoterm", value: rfq.incoterm },
              { label: "Destination", value: `${rfq.destination} · ${rfq.portOfDischarge}` },
              { label: "Delivery window", value: `${day(rfq.deliveryWindow[0])} → ${day(rfq.deliveryWindow[1])}` },
              { label: "Payment terms requested", value: rfq.paymentTermsRequested },
              { label: "Currency", value: rfq.currency },
            ]}
          />
        </Group>
      </div>

      <Group label="Specification" count={`${rfq.specLines.length} lines`}>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 pb-3">
          <EntityLink kind="product" id={rfq.productId} mono={false} className="text-[14px] font-semibold" />
          <span className="text-muted-foreground">·</span>
          <EntityLink kind="variant" id={rfq.variantId} mono={false} className="text-[13px]" />
          {product ? <Pill tone="muted">HS {product.hsCode}</Pill> : null}
          {variant ? <span className="text-[12px] text-muted-foreground">{variant.spec}</span> : null}
        </div>

        <dl className="grid gap-x-8 gap-y-2 border-t border-border pt-3 sm:grid-cols-2">
          {rfq.specLines.map((line) => (
            <div key={line.label} className="flex items-baseline justify-between gap-3">
              <dt className="shrink-0 text-[12px] text-muted-foreground">{line.label}</dt>
              <dd className="text-end text-[13px] font-medium tabular-nums">{line.requirement}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-3 border-t border-border pt-3">
          <Eyebrow>Packaging</Eyebrow>
          <p className="mt-1 text-[13px] leading-relaxed text-foreground">{rfq.packaging}</p>
        </div>
      </Group>

      <div className="grid gap-5 lg:grid-cols-2">
        <Group label="Compliance">
          <Facts
            columns={1}
            rows={[
              {
                label: "Certifications",
                value:
                  rfq.certifications.length === 0 ? (
                    <span className="text-muted-foreground">None required</span>
                  ) : (
                    <span className="flex flex-wrap gap-1">
                      {rfq.certifications.map((certification) => (
                        <Pill key={certification} tone="brand">
                          {certification}
                        </Pill>
                      ))}
                    </span>
                  ),
              },
              {
                label: "Documents required",
                value: (
                  <span className="flex flex-wrap gap-1">
                    {rfq.documentsRequired.map((document) => (
                      <Pill key={document} tone="muted">
                        {document}
                      </Pill>
                    ))}
                  </span>
                ),
              },
              { label: "Inspection", value: rfq.inspection },
            ]}
          />
        </Group>

        <Group label="Dates">
          <Facts
            columns={1}
            rows={[
              { label: "Raised", value: stamp(rfq.raisedAt) },
              {
                label: "Respond by",
                value: (
                  <span className="flex items-center gap-2">
                    {stamp(rfq.respondBy)}
                    {deadline ? <Pill tone={deadline.tone}>{deadline.text}</Pill> : null}
                  </span>
                ),
              },
              { label: "Shipment window", value: `${day(rfq.deliveryWindow[0])} → ${day(rfq.deliveryWindow[1])}` },
              {
                label: "Linked records",
                value: (
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {conversation ? (
                      <EntityLink kind="conversation" id={conversation.id} mono={false} className="text-[13px]">
                        Thread
                      </EntityLink>
                    ) : null}
                    {termSheet ? <EntityLink kind="termSheet" id={termSheet.id} /> : null}
                    {rfq.tradeId ? <EntityLink kind="trade" id={rfq.tradeId} /> : null}
                    {!conversation && !termSheet && !rfq.tradeId ? (
                      <span className="text-muted-foreground">None yet</span>
                    ) : null}
                  </span>
                ),
              },
            ]}
          />
        </Group>
      </div>

      <Group label="Invited growers" count={`${rfq.invitations.filter((i) => i.state === "quoted").length} of ${rfq.invitations.length} quoted`} pad="tight">
        <Rows>
          {rfq.invitations.map((invitation) => {
            const seller = W.sellerById(invitation.sellerId)
            return (
              <Row key={invitation.sellerId}>
                <Dot tone={INVITE_TONE[invitation.state]} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">
                    <EntityLink kind="seller" id={invitation.sellerId} mono={false} className="no-underline hover:underline">
                      {seller?.entity ?? invitation.sellerId}
                    </EntityLink>
                  </span>
                  <span className="block truncate text-[11.5px] text-muted-foreground">
                    {seller?.district}, {seller?.state} · invited {stamp(invitation.invitedAt)}
                    {invitation.declineReason ? ` · ${invitation.declineReason}` : ""}
                  </span>
                </span>
                <Pill tone={INVITE_TONE[invitation.state]}>{invitation.state.replace("-", " ")}</Pill>
              </Row>
            )
          })}
        </Rows>
      </Group>

      <Group label="Quotes" count={quotes.length} pad={quotes.length === 0 ? "normal" : "tight"}>
        {quotes.length === 0 ? (
          <EmptyState icon={ScrollTextIcon} title="No quotes submitted yet" />
        ) : (
          <Rows>
            {quotes.map((quote, index) => {
              const seller = W.sellerById(quote.sellerId)
              const awarded = rfq.awardedQuoteId === quote.id
              return (
                <Row key={quote.id} className={cn(awarded && "bg-amama-subtle")}>
                  <span className="w-5 shrink-0 text-center font-mono text-[11px] text-muted-foreground tabular-nums">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <EntityLink kind="quote" id={quote.id} className="font-semibold" />
                      <span className="truncate text-[13px]">{seller?.entity}</span>
                      {awarded ? <Pill tone="ok">Awarded</Pill> : null}
                    </span>
                    <span className="mt-0.5 block truncate text-[11.5px] text-muted-foreground">
                      {quote.availableMt} MT available · {quote.incoterm} · {quote.leadTimeDays} day lead · valid to{" "}
                      {day(quote.validUntil)}
                      {quote.note ? ` · ${quote.note}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-end">
                    <span className="block text-[14px] font-semibold tabular-nums">
                      {money(quote.priceUsdPerMt, "USD")}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">per MT</span>
                  </span>
                  <Pill tone={QUOTE_TONE[quote.status]}>{quote.status.replace("-", " ")}</Pill>
                </Row>
              )
            })}
          </Rows>
        )}
      </Group>

      {rfq.attachments.length > 0 ? (
        <Group label="Attachments" count={rfq.attachments.length} pad="tight">
          <Rows>
            {rfq.attachments.map((attachment) => {
              const Icon = ATTACHMENT_ICON[attachment.kind]
              return (
                <Row key={attachment.label}>
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-[13px]">{attachment.label}</span>
                  <Pill tone="muted">{attachment.kind}</Pill>
                </Row>
              )
            })}
          </Rows>
        </Group>
      ) : null}

      {rfq.closeReason ? (
        <Group label="Why it closed">
          <p className="text-[13px] leading-relaxed text-foreground">{rfq.closeReason}</p>
        </Group>
      ) : null}

      <Group label="Activity" count={rfq.activity.length}>
        <Timeline
          items={rfq.activity.map((entry, index) => {
            const actorKind: W.EntityKind = entry.actorId.startsWith("u-")
              ? "user"
              : entry.actorId.startsWith("b-")
                ? "buyer"
                : "seller"
            const actor = W.resolveEntity({ kind: actorKind, id: entry.actorId })
            return {
              id: `${rfq.id}-act-${index}`,
              tone: index === rfq.activity.length - 1 ? "brand" : "muted",
              title: entry.text,
              meta: `${actor?.title ?? entry.actorId} · ${stamp(entry.at)}`,
            }
          })}
        />
      </Group>
    </>
  )
}

export { RfqsView, RfqDetailView }
