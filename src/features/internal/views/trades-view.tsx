"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronRightIcon, PackageIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { EntityLink } from "@/features/internal/entity-link"
import { StageRail } from "@/features/internal/stage-rail"
import {
  docStatusTone,
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
  severityTone,
  stageStateTone,
  Timeline,
  type Tone,
} from "@/features/internal/tower-ui"
import * as W from "@/features/tradechain/demo-world"

/**
 * Trades, and inside them the sixteen stages.
 *
 * Every stage renders from the same shape — trigger → system action →
 * human action → documents → the five exception chains — which is the
 * whole point of the model: one screen template instead of sixteen, and
 * one exception engine instead of sixteen inboxes.
 *
 * On the stage screen the chain strip and the chain's accountability are
 * two separate groups on purpose: the steps are what happens, the owner,
 * SLA and escalation are who answers for it, and those are read by two
 * different people.
 */

const ROW =
  "flex items-center gap-3 rounded-[18px] px-3 py-2.5 transition-colors hover:bg-muted"

const STATUS_TONE: Record<W.TradeStatus, Tone> = {
  active: "ok",
  "at-risk": "warn",
  blocked: "crit",
  closed: "muted",
}

const CHAIN_TONE: Record<W.ScenarioKey, Tone> = {
  A: "ok",
  B: "warn",
  C: "crit",
  D: "brand",
  E: "muted",
}

const STEP_BADGE: Record<Tone, string> = {
  ok: "bg-status-success/12 text-status-success",
  warn: "bg-status-warning/12 text-status-warning",
  crit: "bg-destructive/12 text-destructive",
  brand: "bg-amama-subtle text-amama-deep",
  muted: "bg-muted text-muted-foreground",
}

const fmt = (value: string | null | undefined, withTime = true): string => {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
    timeZone: "Asia/Kolkata",
  }).format(new Date(value))
}

/** Hours between now and a deadline, in the demo's frozen clock. */
function hoursUntil(iso: string): number {
  return (new Date(iso).getTime() - new Date(W.NOW).getTime()) / 3_600_000
}

function dueLabel(iso: string): { text: string; tone: Tone } {
  const hours = hoursUntil(iso)
  if (hours < 0) return { text: `Overdue ${Math.abs(Math.round(hours))}h`, tone: "crit" }
  if (hours < 2) return { text: `${Math.round(hours * 60)} min left`, tone: "crit" }
  if (hours < 24) return { text: `${hours.toFixed(1)}h left`, tone: "warn" }
  return { text: `${Math.round(hours / 24)}d left`, tone: "muted" }
}

/* ══════════════════════════════════════════════════════════════════════
   LIST
   ══════════════════════════════════════════════════════════════════════ */

function TradesView() {
  const trades = React.useMemo(() => [...W.TRADES].sort((a, b) => a.currentStage - b.currentStage), [])

  const attention = trades.filter((trade) => trade.status === "at-risk" || trade.status === "blocked")
  const running = trades.filter((trade) => trade.status === "active")
  const closed = trades.filter((trade) => trade.status === "closed")
  const openGates = W.blockingDocuments().length
  const value = trades.reduce((sum, trade) => sum + trade.qtyContractedMt * trade.priceUsdPerMt, 0)

  return (
    <>
      <PageHead title="POs & Trades" />

      <Metrics>
        <Metric label="Live trades" value={trades.length - closed.length} tone="brand" />
        <Metric
          label="At risk or blocked"
          value={attention.length}
          tone={attention.length > 0 ? "warn" : "plain"}
        />
        <Metric label="Open document gates" value={openGates} tone={openGates > 0 ? "crit" : "plain"} />
        <Metric label="Contracted value" value={`$${(value / 1_000_000).toFixed(2)}M`} />
      </Metrics>

      <Group label="The sixteen stages">
        <StageRail orientation="horizontal" />
      </Group>

      {attention.length > 0 ? (
        <Group label="Needs attention" count={attention.length} pad="tight">
          <Rows>
            {attention.map((trade) => (
              <TradeRow key={trade.id} trade={trade} />
            ))}
          </Rows>
        </Group>
      ) : null}

      <Group label="Running" count={running.length} pad="tight">
        <Rows>
          {running.map((trade) => (
            <TradeRow key={trade.id} trade={trade} />
          ))}
        </Rows>
      </Group>

      {closed.length > 0 ? (
        <Group label="Closed" count={closed.length} pad="tight">
          <Rows>
            {closed.map((trade) => (
              <TradeRow key={trade.id} trade={trade} />
            ))}
          </Rows>
        </Group>
      ) : null}
    </>
  )
}

function TradeRow({ trade }: { trade: W.Trade }) {
  const stage = W.stageByNo(trade.currentStage)
  const buyer = W.buyerById(trade.buyerId)

  return (
    <Link href={`/internal/trades/${trade.id}`} className={ROW}>
      <Dot tone={STATUS_TONE[trade.status]} />

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <Mono className="font-semibold">{trade.id}</Mono>
          <Pill tone={STATUS_TONE[trade.status]}>{trade.status}</Pill>
        </span>
        <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
          {W.productById(trade.productId)?.label} · {buyer?.company} · {trade.qtyContractedMt} MT ·{" "}
          {trade.portOfLoading.split(" — ")[1]} → {trade.portOfDischarge.split(" — ")[1]}
        </span>
      </span>

      <span className="hidden w-24 shrink-0 text-end sm:block">
        <span className="block font-mono text-[12px] font-semibold text-amama-deep tabular-nums">
          {String(trade.currentStage).padStart(2, "0")}
        </span>
        <span className="block truncate text-[11px] text-muted-foreground">{stage.short}</span>
      </span>

      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   TRADE DETAIL
   ══════════════════════════════════════════════════════════════════════ */

function TradeDetailView({ tradeId }: { tradeId: string }) {
  const trade = W.tradeById(tradeId)

  if (!trade) {
    return (
      <Island>
        <EmptyState icon={PackageIcon} title="Trade not found" />
      </Island>
    )
  }

  const lots = W.lotsForTrade(trade.id)
  const container = W.containerForTrade(trade.id)
  const documents = W.documentsForTrade(trade.id)
  const openGates = documents.filter(
    (document) => document.requirement === "M" && document.status !== "VERIFIED" && document.status !== "NA"
  )
  const records = W.stageRecordsForTrade(trade.id).filter((record) => record.state !== "pending")
  const stage = W.stageByNo(trade.currentStage)
  const due = dueLabel(trade.nextAction.dueAt)

  return (
    <>
      <div className="px-1">
        <Link
          href="/internal/trades"
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground"
        >
          Trades
        </Link>
      </div>

      <PageHead
        title={trade.id}
        meta={
          <>
            <Pill tone={STATUS_TONE[trade.status]}>{trade.status}</Pill>
            <Pill tone="brand">
              Stage {String(trade.currentStage).padStart(2, "0")} · {stage.short}
            </Pill>
            <Pill tone={due.tone}>{due.text}</Pill>
          </>
        }
      />

      <Group label="Next action">
        <Facts
          columns={3}
          rows={[
            { label: "Action", value: trade.nextAction.label },
            { label: "Owner", value: W.roleById(trade.nextAction.ownerRole).label },
            {
              label: "Due",
              value: (
                <span className="flex flex-wrap items-center gap-2">
                  <span className="tabular-nums">{fmt(trade.nextAction.dueAt)}</span>
                  <Pill tone={due.tone}>{due.text}</Pill>
                </span>
              ),
            },
          ]}
        />
      </Group>

      <Metrics>
        <Metric label="Contracted" value={trade.qtyContractedMt} unit="MT" />
        <Metric
          label="Shipping"
          value={trade.qtyShippedMt ?? "—"}
          unit={trade.qtyShippedMt ? "MT" : undefined}
          foot={
            trade.qtyShippedMt && trade.qtyShippedMt < trade.qtyContractedMt
              ? `${(trade.qtyContractedMt - trade.qtyShippedMt).toFixed(1)} MT graded out`
              : undefined
          }
          tone={trade.qtyShippedMt && trade.qtyShippedMt < trade.qtyContractedMt ? "warn" : "plain"}
        />
        <Metric label="Price" value={`$${trade.priceUsdPerMt.toLocaleString("en-US")}`} unit="/MT" />
        <Metric label="Open gates" value={openGates.length} tone={openGates.length > 0 ? "crit" : "plain"} />
      </Metrics>

      <div className="grid gap-5 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <Group label="Stages" count={`${records.length} of 16`}>
          <StageRail tradeId={trade.id} current={trade.currentStage} />
        </Group>

        <div className="flex min-w-0 flex-col gap-5">
          <Group label="Commercial">
            <Facts
              rows={[
                { label: "Buyer", value: <EntityLink kind="buyer" id={trade.buyerId} mono={false} /> },
                { label: "Account manager", value: <EntityLink kind="user" id={trade.kamId} mono={false} /> },
                { label: "Incoterm", value: trade.incoterm },
                { label: "Payment", value: trade.paymentTerms },
                {
                  label: "Delivery window",
                  value: `${fmt(trade.deliveryWindow[0], false)} → ${fmt(trade.deliveryWindow[1], false)}`,
                },
                { label: "Contract signed", value: fmt(trade.contractSignedAt) },
              ]}
            />
          </Group>

          <Group label="Product">
            <Facts
              rows={[
                { label: "Product", value: <EntityLink kind="product" id={trade.productId} mono={false} /> },
                { label: "Variant", value: <EntityLink kind="variant" id={trade.variantId} mono={false} /> },
                { label: "Origin", value: trade.origin },
                { label: "Destination", value: trade.destination },
                { label: "Spec", value: trade.spec, wide: true },
              ]}
            />
          </Group>

          {lots.length > 0 ? (
            <Group label="Lots" count={lots.length} pad="tight">
              <Rows>
                {lots.map((lot) => (
                  <Row key={lot.id}>
                    <EntityLink kind="lot" id={lot.id} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-muted-foreground">
                      {W.sellerById(lot.sellerId)?.entity} · {(lot.qtyAcceptedKg / 1000).toFixed(2)} MT ·{" "}
                      {fmt(lot.harvestedAt, false)}
                    </span>
                    <Pill tone={lot.qcDecision === "PASS" ? "ok" : lot.qcDecision === "CONDITIONAL" ? "warn" : "crit"}>
                      {lot.qcDecision}
                    </Pill>
                  </Row>
                ))}
              </Rows>
            </Group>
          ) : null}

          {container ? (
            <Group label="Logistics">
              <Facts
                rows={[
                  { label: "Container", value: <EntityLink kind="container" id={container.id} /> },
                  { label: "Vessel", value: `${container.line} · ${container.vessel} ${container.voyage}` },
                  { label: "Set point", value: `${container.setpointC} °C · vent ${container.ventCbmPerHr} CBM/hr` },
                  { label: "Seal", value: container.sealNo || "Not yet sealed" },
                  { label: "Gate-in cut-off", value: fmt(container.cutoffGateIn) },
                  { label: "ETD → ETA", value: `${fmt(container.etd, false)} → ${fmt(container.eta, false)}` },
                  {
                    label: "Backup sailing",
                    value: container.backupBookingRef
                      ? `${container.backupBookingRef} · ${fmt(container.backupEtd, false)}`
                      : "None held",
                  },
                ]}
              />
            </Group>
          ) : null}

          <Group
            label="Documents"
            count={openGates.length > 0 ? `${openGates.length} open of ${documents.length}` : documents.length}
            action={
              <Link
                href={`/internal/documents?trade=${trade.id}`}
                className="text-[11px] font-medium text-amama-deep hover:underline"
              >
                Document control
              </Link>
            }
            pad="tight"
          >
            <Rows>
              {(openGates.length > 0 ? openGates : documents.slice(0, 6)).map((document) => (
                <Row key={document.id}>
                  <Dot tone={docStatusTone(document.status)} />
                  <EntityLink
                    kind="document"
                    id={document.id}
                    mono={false}
                    className="min-w-0 flex-1 truncate text-[13px] font-medium"
                  />
                  <Mono className="shrink-0 text-[11px] text-muted-foreground">
                    S{String(document.stage).padStart(2, "0")}
                  </Mono>
                  <Pill tone={docStatusTone(document.status)}>{document.status}</Pill>
                </Row>
              ))}
            </Rows>
          </Group>

          <Group label="Stage history" count={records.length}>
            <Timeline
              items={records.map((record) => ({
                id: record.id,
                tone: stageStateTone(record.state),
                title: (
                  <Link
                    href={`/internal/trades/${trade.id}/stage/${record.stage}`}
                    className="inline-flex items-baseline gap-2 hover:text-amama-deep"
                  >
                    <Mono className="text-[11px] text-muted-foreground">
                      {String(record.stage).padStart(2, "0")}
                    </Mono>
                    {W.stageByNo(record.stage).name}
                  </Link>
                ),
                meta: (
                  <span className="inline-flex items-center gap-1.5">
                    <Pill tone={stageStateTone(record.state)}>{record.state}</Pill>
                    <Pill tone="muted">Chain {record.scenario}</Pill>
                  </span>
                ),
                body: record.outcome,
              }))}
            />
          </Group>
        </div>
      </div>
    </>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   ONE STAGE, ON ONE TRADE
   ══════════════════════════════════════════════════════════════════════ */

function StageDetailView({ tradeId, stageNo }: { tradeId: string; stageNo: number }) {
  const trade = W.tradeById(tradeId)
  const stage = stageNo >= 1 && stageNo <= 16 ? W.stageByNo(stageNo as W.StageNo) : undefined
  const record = trade && stage ? W.stageRecord(trade.id, stage.n) : undefined

  // Hooks run before any early return — the chain the trade actually took
  // is the sensible default tab, falling back to the happy path.
  const [activeChain, setActiveChain] = React.useState<W.ScenarioKey>(record?.scenario ?? "A")

  if (!trade || !stage) {
    return (
      <Island>
        <EmptyState icon={PackageIcon} title="Stage not found" />
      </Island>
    )
  }

  const documents = W.documentsForStage(trade.id, stage.n)
  const phase = W.phaseForStage(stage.n)
  const chain = stage.scenarios[activeChain]
  const meta = W.SCENARIOS.find((scenario) => scenario.key === activeChain)
  const badge = STEP_BADGE[CHAIN_TONE[activeChain]]

  return (
    <>
      <div className="px-1">
        <Link
          href={`/internal/trades/${trade.id}`}
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground"
        >
          {trade.id}
        </Link>
      </div>

      <PageHead
        title={
          <span className="flex items-baseline gap-3">
            <span className="font-mono text-[24px] text-amama-deep tabular-nums">
              {String(stage.n).padStart(2, "0")}
            </span>
            {stage.name}
          </span>
        }
        meta={
          <>
            {record ? <Pill tone={stageStateTone(record.state)}>{record.state}</Pill> : null}
            <Pill tone="muted">{phase.label}</Pill>
            <Pill tone="muted">{W.roleById(stage.ownerRole).label}</Pill>
            <Pill tone="muted">SLA {stage.sla}</Pill>
          </>
        }
      />

      <Group label="Stages" count={`${stage.n} of 16`}>
        <StageRail tradeId={trade.id} current={stage.n} orientation="horizontal" />
      </Group>

      {record && record.state !== "pending" ? (
        <Group label={`On ${trade.id}`} count={`chain ${record.scenario}`}>
          <p className="text-[13.5px] leading-relaxed text-foreground">{record.outcome}</p>
        </Group>
      ) : null}

      <Group label="How this stage runs">
        <Facts
          rows={[
            { label: "Input", value: stage.input },
            { label: "Output", value: stage.output },
            { label: "Trigger", value: stage.trigger },
            { label: "System does", value: stage.systemAction },
            { label: "Human does", value: stage.humanAction },
            { label: "Owner", value: W.roleById(stage.ownerRole).label },
            {
              label: "Supporting",
              value: stage.supportRoles.map((role) => W.roleById(role).label).join(", ") || "—",
            },
            {
              label: "Risk",
              value: (
                <Pill tone={stage.risk > 50 ? "crit" : stage.risk > 35 ? "warn" : "ok"}>
                  {stage.risk} · {stage.band}
                </Pill>
              ),
            },
          ]}
        />
      </Group>

      <Group label="Notifications" count={stage.notifications.length} pad="tight">
        <Rows>
          {stage.notifications.map((notification) => (
            <Row key={notification.text}>
              <Pill tone={severityTone(notification.level)}>{notification.level}</Pill>
              <span className="min-w-0 flex-1 text-[13px]">{notification.text}</span>
            </Row>
          ))}
        </Rows>
      </Group>

      <Group label="Documents" count={documents.length}>
        {documents.length === 0 ? (
          <EmptyState icon={PackageIcon} title="No documents on this stage yet" />
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {documents.map((document) => (
              <div key={document.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <EntityLink
                    kind="document"
                    id={document.id}
                    mono={false}
                    className="text-[13px] font-semibold"
                  />
                  <Pill tone={document.requirement === "M" ? "brand" : "muted"}>
                    {document.requirement === "M" ? "Mandatory" : "Optional"}
                  </Pill>
                  <Pill tone={docStatusTone(document.status)} className="ms-auto">
                    {document.status}
                  </Pill>
                </div>

                <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{document.why}</p>

                {document.blocks.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {document.blocks.map((block) => (
                      <Pill key={block} tone="crit">
                        Blocks: {block}
                      </Pill>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Group>

      <Group label="Exception chains" count={W.SCENARIOS.length} pad="tight">
        <div className="flex flex-wrap gap-1.5 p-1">
          {W.SCENARIOS.map((scenario) => {
            const active = scenario.key === activeChain
            const ran = record?.scenario === scenario.key
            return (
              <button
                key={scenario.key}
                type="button"
                onClick={() => setActiveChain(scenario.key)}
                aria-pressed={active}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                  active
                    ? "border border-amama-foreground bg-amama text-amama-foreground"
                    : "text-foreground/80 hover:bg-muted"
                )}
              >
                <span className="font-mono">{scenario.key}</span>
                {scenario.label}
                {ran ? <span className="text-[10px] opacity-70">· ran</span> : null}
              </button>
            )
          })}
        </div>
      </Group>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <Group
          label={`Chain ${activeChain} · ${meta?.label ?? ""}`}
          count={`${chain.steps.length} steps`}
        >
          {meta ? (
            <p className="text-[13px] leading-relaxed text-muted-foreground">{meta.blurb}</p>
          ) : null}

          <div className="mt-3 border-t border-border pt-3">
            <Eyebrow>Trigger</Eyebrow>
            <p className="mt-1 text-[13.5px] font-semibold">{chain.trigger}</p>
          </div>

          <ol className="mt-3 flex flex-col">
            {chain.steps.map((step, index) => (
              <li key={step} className="flex gap-3 py-1.5">
                <span
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full font-mono text-[10px] font-bold tabular-nums",
                    badge
                  )}
                >
                  {index + 1}
                </span>
                <span className="text-[13px] leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </Group>

        <Group label="Accountability">
          <Facts
            columns={1}
            rows={[
              { label: "Owner", value: W.roleById(chain.owner).label },
              { label: "SLA", value: chain.sla },
              {
                label: "Escalation",
                value:
                  chain.escalation.length === 0 ? (
                    <span className="text-muted-foreground">Terminal</span>
                  ) : (
                    <span className="flex flex-wrap items-center gap-1">
                      {chain.escalation.map((role, index) => (
                        <React.Fragment key={role}>
                          {index > 0 ? <span className="text-[11px] text-muted-foreground">→</span> : null}
                          <Pill tone="muted">{W.roleById(role).label}</Pill>
                        </React.Fragment>
                      ))}
                    </span>
                  ),
              },
            ]}
          />
        </Group>
      </div>

      <Group label="Worked example">
        <p className="text-[13.5px] leading-relaxed text-muted-foreground">{stage.worked}</p>
      </Group>
    </>
  )
}

export { TradesView, TradeDetailView, StageDetailView }
