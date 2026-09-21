"use client"

import Link from "next/link"
import { ChevronRightIcon, FileSignatureIcon } from "lucide-react"

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
  Meter,
  Mono,
  PageHead,
  Pill,
  Row,
  Rows,
  type Tone,
} from "@/features/internal/tower-ui"
import * as W from "@/features/tradechain/demo-world"

/**
 * The term sheet is the middle of the commercial chain — it is where a
 * quote stops being a number and becomes eight separately-agreed clauses.
 * Modelling it clause by clause rather than as one document is what lets a
 * KAM see that a negotiation is not vaguely "in progress" but stuck on
 * exactly two lines, which is a different conversation entirely.
 *
 * The meter carries that split everywhere the sheet appears, so the
 * agreed / disputed / pending shape is legible from the list without
 * opening anything.
 */

const ROW =
  "flex items-center gap-3 rounded-[18px] px-3 py-2.5 transition-colors hover:bg-muted"

const STATUS_TONE: Record<W.TermSheetStatus, Tone> = {
  signed: "ok",
  "in-negotiation": "warn",
  rejected: "crit",
  draft: "muted",
}

const CLAUSE_TONE: Record<W.ClauseStatus, Tone> = {
  agreed: "ok",
  disputed: "crit",
  pending: "muted",
}

const PO_TONE: Record<W.PoStatus, Tone> = {
  "auto-accepted": "ok",
  confirmed: "ok",
  "pending-confirmation": "warn",
  cancelled: "muted",
}

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

function progressOf(sheet: W.TermSheet) {
  const agreed = sheet.clauses.filter((clause) => clause.status === "agreed").length
  const disputed = sheet.clauses.filter((clause) => clause.status === "disputed").length
  const pending = sheet.clauses.length - agreed - disputed
  return { agreed, disputed, pending, total: sheet.clauses.length }
}

function clauseSegments(sheet: W.TermSheet) {
  const { agreed, disputed, pending } = progressOf(sheet)
  return [
    { value: agreed, tone: "ok" as Tone, label: `${agreed} agreed` },
    { value: disputed, tone: "crit" as Tone, label: `${disputed} disputed` },
    { value: pending, tone: "muted" as Tone, label: `${pending} pending` },
  ]
}

/* ══════════════════════════════════════════════════════════════════════
   LIST
   ══════════════════════════════════════════════════════════════════════ */

function TermSheetsView() {
  const open = W.TERM_SHEETS.filter((sheet) => sheet.status === "draft" || sheet.status === "in-negotiation")
  const closed = W.TERM_SHEETS.filter((sheet) => sheet.status === "signed" || sheet.status === "rejected")
  const disputed = W.TERM_SHEETS.reduce((sum, sheet) => sum + progressOf(sheet).disputed, 0)

  return (
    <>
      <PageHead title="Term Sheets" />

      <Metrics>
        <Metric label="Open" value={open.length} tone="brand" />
        <Metric label="Signed" value={W.TERM_SHEETS.filter((sheet) => sheet.status === "signed").length} />
        <Metric label="Disputed clauses" value={disputed} tone={disputed > 0 ? "crit" : "plain"} />
        <Metric label="Purchase orders issued" value={W.PURCHASE_ORDERS.length} />
      </Metrics>

      <Group label="Open" count={open.length} pad="tight">
        <Rows>
          {open.map((sheet) => (
            <SheetRow key={sheet.id} sheet={sheet} />
          ))}
        </Rows>
      </Group>

      <Group label="Closed" count={closed.length} pad="tight">
        <Rows>
          {closed.map((sheet) => (
            <SheetRow key={sheet.id} sheet={sheet} />
          ))}
        </Rows>
      </Group>
    </>
  )
}

function SheetRow({ sheet }: { sheet: W.TermSheet }) {
  const { agreed, disputed, total } = progressOf(sheet)
  const buyer = W.buyerById(sheet.buyerId)

  return (
    <Link href={`/internal/term-sheets/${sheet.id}`} className={ROW}>
      <Dot tone={STATUS_TONE[sheet.status]} />

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <Mono className="font-semibold">{sheet.id}</Mono>
          <Pill tone={STATUS_TONE[sheet.status]}>{sheet.status}</Pill>
          <span className="truncate text-[13px] text-foreground">{buyer?.company}</span>
        </span>
        <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
          v{sheet.version} · opened {day(sheet.openedAt)}
          {sheet.closedAt ? ` · closed ${day(sheet.closedAt)}` : ""}
        </span>
      </span>

      <span className="hidden w-32 shrink-0 sm:block">
        <Meter segments={clauseSegments(sheet)} />
        <span className="mt-1 block text-end text-[11px] text-muted-foreground tabular-nums">
          {agreed}/{total} agreed
        </span>
      </span>

      {disputed > 0 ? <Pill tone="crit">{disputed} disputed</Pill> : null}

      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   DETAIL
   ══════════════════════════════════════════════════════════════════════ */

function TermSheetDetailView({ termSheetId }: { termSheetId: string }) {
  const sheet = W.termSheetById(termSheetId)

  if (!sheet) {
    return (
      <Island>
        <EmptyState icon={FileSignatureIcon} title="Term sheet not found" />
      </Island>
    )
  }

  const { agreed, disputed, pending, total } = progressOf(sheet)
  const po = sheet.poId ? W.poById(sheet.poId) : null
  const conversation = W.CONVERSATIONS.find((thread) => thread.rfqId === sheet.rfqId)

  return (
    <>
      <div className="px-1">
        <Link
          href="/internal/term-sheets"
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground"
        >
          Term sheets
        </Link>
      </div>

      <PageHead
        title={sheet.id}
        meta={
          <>
            <Pill tone={STATUS_TONE[sheet.status]}>{sheet.status}</Pill>
            <Pill tone="muted">version {sheet.version}</Pill>
            {disputed > 0 ? <Pill tone="crit">{disputed} disputed</Pill> : null}
          </>
        }
      />

      <Metrics>
        <Metric label="Agreed" value={agreed} foot={`of ${total} clauses`} tone="brand" />
        <Metric label="Disputed" value={disputed} tone={disputed > 0 ? "crit" : "plain"} />
        <Metric label="Pending" value={pending} tone={pending > 0 ? "warn" : "plain"} />
        <Metric label="Opened" value={day(sheet.openedAt)} foot={sheet.closedAt ? `closed ${day(sheet.closedAt)}` : undefined} />
      </Metrics>

      <div className="grid gap-5 lg:grid-cols-2">
        <Group label="Parties">
          <Facts
            columns={1}
            rows={[
              { label: "Buyer", value: <EntityLink kind="buyer" id={sheet.buyerId} mono={false} /> },
              { label: "Account manager", value: <EntityLink kind="user" id={sheet.kamId} mono={false} /> },
            ]}
          />
        </Group>

        <Group label="Linked records">
          <Facts
            columns={1}
            rows={[
              { label: "From RFQ", value: <EntityLink kind="rfq" id={sheet.rfqId} /> },
              {
                label: "Thread",
                value: conversation ? (
                  <EntityLink kind="conversation" id={conversation.id} mono={false} className="text-[13px]">
                    {conversation.subject}
                  </EntityLink>
                ) : (
                  <span className="text-muted-foreground">None</span>
                ),
              },
              {
                label: "Trade",
                value: sheet.tradeId ? (
                  <EntityLink kind="trade" id={sheet.tradeId} />
                ) : (
                  <span className="text-muted-foreground">Not yet contracted</span>
                ),
              },
              {
                label: "Purchase order",
                value: sheet.poId ? (
                  <EntityLink kind="po" id={sheet.poId} />
                ) : (
                  <span className="text-muted-foreground">Not yet issued</span>
                ),
              },
            ]}
          />
        </Group>
      </div>

      <Group label="Clauses" count={`${agreed} of ${total} agreed`}>
        <Meter segments={clauseSegments(sheet)} className="mb-4" />

        <div className="flex flex-col divide-y divide-border">
          {sheet.clauses.map((clause, index) => (
            <div key={clause.id} className="py-3.5 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <Mono className="text-[11px] text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </Mono>
                <span className="text-[13.5px] font-semibold">{clause.label}</span>
                <Pill tone={CLAUSE_TONE[clause.status]} className="ms-auto">
                  {clause.status}
                </Pill>
              </div>

              <div className="mt-2 flex flex-col gap-2 ps-7">
                <div>
                  <Eyebrow>AMAMA position</Eyebrow>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-foreground">{clause.amamaPosition}</p>
                </div>

                {clause.buyerPosition ? (
                  <div>
                    <Eyebrow>Buyer position</Eyebrow>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-status-warning">{clause.buyerPosition}</p>
                  </div>
                ) : null}

                {clause.note ? (
                  <p className="text-[12px] leading-relaxed text-muted-foreground italic">{clause.note}</p>
                ) : null}

                {clause.agreedAt ? (
                  <p className="text-[11px] text-muted-foreground tabular-nums">Agreed {stamp(clause.agreedAt)}</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </Group>

      {po ? (
        <Group label="Purchase order" count={po.deviations.length > 0 ? `${po.deviations.length} deviations` : "matched"}>
          <Facts
            rows={[
              { label: "PO", value: <EntityLink kind="po" id={po.id} /> },
              { label: "Status", value: <Pill tone={PO_TONE[po.status]}>{po.status}</Pill> },
              { label: "Quantity", value: `${po.qtyMt} MT` },
              { label: "Price", value: `USD ${po.priceUsdPerMt.toLocaleString("en-US")} / MT` },
              { label: "Incoterm", value: po.incoterm },
              { label: "Payment", value: po.paymentTerms },
              { label: "Issued", value: stamp(po.issuedAt) },
              {
                label: "Confirmed",
                value: po.confirmedAt ? (
                  `${stamp(po.confirmedAt)} · ${po.confirmedBy === "system" ? "system" : (W.userById(po.confirmedBy ?? "")?.name ?? po.confirmedBy)}`
                ) : (
                  <span className="text-muted-foreground">Awaiting confirmation</span>
                ),
              },
            ]}
          />

          {po.deviations.length > 0 ? (
            <div className="mt-4 border-t border-border pt-3">
              <Eyebrow>Deviations from the agreed sheet</Eyebrow>
              <ul className="mt-1.5 flex flex-col gap-1.5">
                {po.deviations.map((deviation) => (
                  <li key={deviation} className="flex gap-2 text-[13px] leading-relaxed text-status-warning">
                    <Dot tone="warn" className="mt-1.5" />
                    {deviation}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Group>
      ) : null}
    </>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   PURCHASE ORDERS
   ══════════════════════════════════════════════════════════════════════ */

/** Purchase orders across the book — the other half of the commercial
 *  chain, and where the auto-accept vs counter-offer distinction lives. */
function PurchaseOrdersView() {
  const pending = W.PURCHASE_ORDERS.filter((po) => po.status === "pending-confirmation")
  const settled = W.PURCHASE_ORDERS.filter(
    (po) => po.status === "auto-accepted" || po.status === "confirmed"
  )
  const cancelled = W.PURCHASE_ORDERS.filter((po) => po.status === "cancelled")
  const deviations = W.PURCHASE_ORDERS.reduce((sum, po) => sum + po.deviations.length, 0)
  const value = W.PURCHASE_ORDERS.reduce((sum, po) => sum + po.qtyMt * po.priceUsdPerMt, 0)

  return (
    <>
      <PageHead title="Purchase Orders" />

      <Metrics>
        <Metric label="Issued" value={W.PURCHASE_ORDERS.length} tone="brand" />
        <Metric label="Awaiting confirmation" value={pending.length} tone={pending.length > 0 ? "warn" : "plain"} />
        <Metric label="Deviations" value={deviations} tone={deviations > 0 ? "crit" : "plain"} />
        <Metric label="Ordered value" value={`$${(value / 1_000_000).toFixed(2)}M`} />
      </Metrics>

      {pending.length > 0 ? (
        <Group label="Awaiting confirmation" count={pending.length} pad="tight">
          <Rows>
            {pending.map((po) => (
              <PoRow key={po.id} po={po} />
            ))}
          </Rows>
        </Group>
      ) : null}

      <Group label="Accepted" count={settled.length} pad="tight">
        <Rows>
          {settled.map((po) => (
            <PoRow key={po.id} po={po} />
          ))}
        </Rows>
      </Group>

      {cancelled.length > 0 ? (
        <Group label="Cancelled" count={cancelled.length} pad="tight">
          <Rows>
            {cancelled.map((po) => (
              <PoRow key={po.id} po={po} />
            ))}
          </Rows>
        </Group>
      ) : null}
    </>
  )
}

function PoRow({ po }: { po: W.PurchaseOrder }) {
  return (
    <Row>
      <Dot tone={PO_TONE[po.status]} />

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <EntityLink kind="po" id={po.id} className="font-semibold" />
          <Pill tone={PO_TONE[po.status]}>{po.status}</Pill>
          {po.deviations.length > 0 ? <Pill tone="crit">{po.deviations.length} deviations</Pill> : null}
        </span>
        <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
          {W.buyerById(po.buyerId)?.company} · {po.qtyMt} MT · USD{" "}
          {po.priceUsdPerMt.toLocaleString("en-US")}/MT · {po.incoterm}
        </span>
      </span>

      <span className="hidden shrink-0 text-end sm:block">
        <span className="block text-[13px] font-semibold tabular-nums">
          {`USD ${(po.qtyMt * po.priceUsdPerMt).toLocaleString("en-US")}`}
        </span>
        <span className="block text-[11px] text-muted-foreground">order value</span>
      </span>

      {po.tradeId ? <EntityLink kind="trade" id={po.tradeId} /> : null}
      {po.termSheetId ? <EntityLink kind="termSheet" id={po.termSheetId} /> : null}
    </Row>
  )
}

export { TermSheetsView, TermSheetDetailView, PurchaseOrdersView }
