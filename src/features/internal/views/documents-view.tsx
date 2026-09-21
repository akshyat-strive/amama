"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ChevronRightIcon, FileCheckIcon } from "lucide-react"

import { EntityChip, EntityLink } from "@/features/internal/entity-link"
import {
  docStatusTone,
  Dot,
  EmptyState,
  Eyebrow,
  Group,
  Metric,
  Metrics,
  PageHead,
  Pill,
  Row,
  Rows,
} from "@/features/internal/tower-ui"
import * as W from "@/features/tradechain/demo-world"

/**
 * Document control.
 *
 * The one idea this screen exists to carry: **a document is a gate, not an
 * attachment.** A missing phytosanitary certificate is not a blank field on
 * a form — it is a container that does not get on a vessel. So the open
 * gates are the first group under the title, and each row carries its
 * `blocks[]` list as crit pills that name what it is actually holding up.
 *
 * A trade's own set is then one group per stage rather than one long
 * island: the documents of stage 08 are answered together, by the same
 * person, on the same day — and the gap to stage 09 is the thing that says
 * so.
 */

/** Worst first — a REJECTED form and a MISSING acceptance are today's
 *  problems in a way that a PENDING draft B/L is not. */
const STATUS_RANK: Record<W.DocStatus, number> = {
  REJECTED: 0,
  MISSING: 1,
  PENDING: 2,
  VERIFIED: 3,
  NA: 4,
}

const stamp = (value: string): string =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value))

const day = (value: string): string =>
  new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))

const stageLabel = (n: W.StageNo): string => `${String(n).padStart(2, "0")} · ${W.stageByNo(n).short}`

const countByStatus = (status: W.DocStatus): number =>
  W.DOCUMENTS.filter((entry) => entry.status === status).length

const openGatesForTrade = (tradeId: string): number =>
  W.documentsForTrade(tradeId).filter(
    (entry) => entry.requirement === "M" && entry.status !== "VERIFIED" && entry.status !== "NA"
  ).length

/* ── one document row ─────────────────────────────────────────────── */

function DocumentRow({ doc, showTrade }: { doc: W.TradeDocument; showTrade: boolean }) {
  return (
    <Row className="items-start">
      <Dot tone={docStatusTone(doc.status)} className="mt-2" />

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <EntityLink kind="document" id={doc.id} mono={false} className="text-[13.5px] font-semibold">
            {doc.name}
          </EntityLink>
          <Pill tone={docStatusTone(doc.status)}>{doc.status}</Pill>
          <Pill tone="muted">{doc.requirement === "M" ? "Mandatory" : "Optional"}</Pill>
        </span>

        <span className="mt-0.5 block text-[12px] text-muted-foreground">
          {showTrade ? (
            <>
              <EntityLink kind="trade" id={doc.tradeId} />
              {" · "}
            </>
          ) : null}
          <EntityLink kind="stage" id={String(doc.stage)} mono={false}>
            {stageLabel(doc.stage)}
          </EntityLink>
          {" · "}
          {doc.issuer}
        </span>

        {/* The blocks[] array — the field that turns a tracker into a tower. */}
        {doc.blocks.length > 0 ? (
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Eyebrow className="text-destructive">Holds up</Eyebrow>
            {doc.blocks.map((block) => (
              <Pill key={block} tone="crit">
                {block}
              </Pill>
            ))}
          </span>
        ) : null}

        {doc.note ? (
          <span className="mt-1 block text-[12.5px] leading-relaxed text-muted-foreground">{doc.note}</span>
        ) : null}
      </span>

      <span className="hidden w-28 shrink-0 text-end sm:block">
        <span className="block text-[12px] text-muted-foreground tabular-nums">
          {doc.issuedOn ? day(doc.issuedOn) : "—"}
        </span>
        {doc.expiresOn ? (
          <span className="block text-[11px] text-muted-foreground tabular-nums">exp {day(doc.expiresOn)}</span>
        ) : null}
      </span>

      <span className="hidden w-40 shrink-0 text-end text-[12px] text-muted-foreground sm:block">
        {doc.verifiedBy ? (
          <>
            <EntityLink kind="user" id={doc.verifiedBy} mono={false} className="text-[12px]" />
            {doc.verifiedAt ? (
              <span className="block text-[11px] text-muted-foreground tabular-nums">{stamp(doc.verifiedAt)}</span>
            ) : null}
          </>
        ) : (
          "Not verified"
        )}
      </span>
    </Row>
  )
}

/* ── one trade's full document set, one group per stage ───────────── */

function TradeDocumentSet({ trade }: { trade: W.Trade }) {
  const documents = W.documentsForTrade(trade.id)
  const stages = [...new Set(documents.map((entry) => entry.stage))].sort((a, b) => a - b)

  return (
    <>
      {stages.map((stage) => {
        const forStage = W.documentsForStage(trade.id, stage)
        const open = forStage.filter(
          (entry) => entry.requirement === "M" && entry.status !== "VERIFIED" && entry.status !== "NA"
        ).length
        return (
          <Group
            key={stage}
            label={stageLabel(stage)}
            count={forStage.length}
            action={open > 0 ? <Pill tone="crit">{open} open</Pill> : <Pill tone="ok">Clear</Pill>}
            pad="tight"
          >
            <Rows>
              {forStage.map((entry) => (
                <DocumentRow key={entry.id} doc={entry} showTrade={false} />
              ))}
            </Rows>
          </Group>
        )
      })}
    </>
  )
}

/* ── the tower ────────────────────────────────────────────────────── */

function DocumentsControlTower() {
  const searchParams = useSearchParams()
  const tradeId = searchParams.get("trade")
  const trade = tradeId ? W.tradeById(tradeId) : null

  const gates = [...W.blockingDocuments()].sort(
    (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.tradeId.localeCompare(b.tradeId) || a.stage - b.stage
  )

  return (
    <>
      <PageHead
        title="Documents"
        meta={
          <>
            <Pill tone={gates.length > 0 ? "crit" : "ok"}>{gates.length} open gates</Pill>
            {trade ? <EntityChip kind="trade" id={trade.id} label={trade.id} /> : null}
          </>
        }
        action={
          trade ? (
            <Link
              href="/internal/documents"
              className="rounded-full bg-muted px-3 py-1.5 text-[12.5px] font-medium transition-colors hover:bg-amama-subtle"
            >
              All trades
            </Link>
          ) : null
        }
      />

      <Metrics>
        <Metric label="Documents" value={W.DOCUMENTS.length} foot={`${W.TRADES.length} trades`} />
        <Metric label="Verified" value={countByStatus("VERIFIED")} tone="brand" />
        <Metric label="Pending" value={countByStatus("PENDING")} tone="warn" />
        <Metric label="Missing" value={countByStatus("MISSING")} tone="crit" />
        <Metric label="Rejected" value={countByStatus("REJECTED")} tone="crit" />
        <Metric label="Not applicable" value={countByStatus("NA")} />
      </Metrics>

      <Group
        label="Open gates"
        count={gates.length}
        pad={gates.length === 0 ? "normal" : "tight"}
      >
        {gates.length === 0 ? (
          <EmptyState icon={FileCheckIcon} title="No open gates" />
        ) : (
          <Rows>
            {gates.map((entry) => (
              <DocumentRow key={entry.id} doc={entry} showTrade />
            ))}
          </Rows>
        )}
      </Group>

      {trade ? (
        <TradeDocumentSet trade={trade} />
      ) : (
        <Group label="Trades" count={W.TRADES.length} pad="tight">
          <Rows>
            {W.TRADES.map((entry) => {
              const open = openGatesForTrade(entry.id)
              return (
                <Row key={entry.id}>
                  <Dot tone={open > 0 ? "crit" : "ok"} />
                  <span className="min-w-0 flex-1">
                    <span className="block">
                      <EntityLink kind="trade" id={entry.id} className="font-semibold" />
                    </span>
                    <span className="block truncate text-[11.5px] text-muted-foreground">
                      {W.buyerById(entry.buyerId)?.company} · {W.documentsForTrade(entry.id).length} documents
                    </span>
                  </span>
                  <Pill tone={open > 0 ? "crit" : "ok"}>{open > 0 ? `${open} open` : "Clear"}</Pill>
                  <Link
                    href={`/internal/documents?trade=${encodeURIComponent(entry.id)}`}
                    aria-label={`Open the document set for ${entry.id}`}
                    className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <ChevronRightIcon className="size-4" />
                  </Link>
                </Row>
              )
            })}
          </Rows>
        </Group>
      )}
    </>
  )
}

/** `useSearchParams` reads `?trade=`, so the tree below it carries its own
 *  Suspense boundary rather than depending on the route to supply one. */
function DocumentsView() {
  return (
    <React.Suspense fallback={<div className="h-64 animate-pulse rounded-[24px] bg-card" />}>
      <DocumentsControlTower />
    </React.Suspense>
  )
}

export { DocumentsView }
