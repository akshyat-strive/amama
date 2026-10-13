"use client"

import * as React from "react"
import Link from "next/link"
import { AlertTriangleIcon, CheckIcon, GitPullRequestArrowIcon, PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import * as W from "@/features/tradechain/demo-world"
import { assessChange, describeChange } from "@/features/tradechain/change-impact"
import { actorName, perform, useLiveWorld, type Actor } from "@/features/tradechain/live-world"
import { PAGE_TABS_SPACE, PageTabs } from "@/features/dashboard/page-tabs"
import { actorFor } from "@/features/trades/trade-actions"
import type { TradePerspective } from "@/features/trades/trade-access"
import { formatStamp, pad2, portName } from "@/features/trades/trade-format"
import { EmptyNote, Mono, Panel, Pill, StatTile, Status } from "@/features/trades/trade-ui"

/**
 * Scenario E — commercial change. Every request runs the same five steps
 * the brief gives: impact analysis, inventory + logistics, cost & margin,
 * documents, then an approval that issues a revised trade plan. Buyers
 * and growers raise; AMAMA decides.
 */

const KIND_LABEL: Record<W.ChangeKind, string> = {
  quantity: "Quantity",
  price: "Price",
  date: "Delivery date",
  destination: "Destination",
  spec: "Specification",
}

const STATUS_LABEL: Record<W.ChangeStatus, string> = {
  "awaiting-approval": "Awaiting approval",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
}

const STATUS_TONE: Record<W.ChangeStatus, "ok" | "warn" | "crit" | "muted"> = {
  "awaiting-approval": "warn",
  approved: "ok",
  rejected: "crit",
  withdrawn: "muted",
}

/** What each party may ask to change. Growers can move their own supply
 *  — quantity and timing — but not the buyer's price or port. */
const KINDS_FOR: Record<TradePerspective, W.ChangeKind[]> = {
  internal: ["quantity", "price", "date", "destination", "spec"],
  buyer: ["quantity", "price", "date", "destination", "spec"],
  seller: ["quantity", "date"],
}

const PORTS = [
  "AEJEA — Jebel Ali",
  "SAJED — Jeddah",
  "SADMM — Dammam",
  "QAHMD — Hamad",
  "OMSOH — Sohar",
  "NLRTM — Rotterdam",
  "GBFXT — Felixstowe",
  "GBLON — London Gateway",
  "DEHAM — Hamburg",
  "RULED — St Petersburg",
  "RUNVS — Novorossiysk",
  "SGSIN — Singapore",
]

const usd = (value: number) => `${value < 0 ? "−" : ""}USD ${Math.abs(Math.round(value)).toLocaleString("en-US")}`

/** Chain E's five steps, in the short form a progress strip can carry. */
const CHAIN_STEPS = ["Impact", "Inventory & logistics", "Cost & margin", "Documents", "Approval"]

function partyName(party: W.PartyKind, id: string): string {
  return actorName({ party, id })
}

/* ── raising a change ───────────────────────────────────────────────── */

function RaiseChangeDialog({
  open,
  onOpenChange,
  trade,
  perspective,
  actor,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  trade: W.Trade
  perspective: TradePerspective
  actor: Actor
}) {
  const kinds = KINDS_FOR[perspective]
  const [kind, setKind] = React.useState<W.ChangeKind>(kinds[0])
  const [quantity, setQuantity] = React.useState(String(trade.qtyContractedMt))
  const [price, setPrice] = React.useState(String(trade.priceUsdPerMt))
  const [from, setFrom] = React.useState(trade.deliveryWindow[0])
  const [to, setTo] = React.useState(trade.deliveryWindow[1])
  const [port, setPort] = React.useState(trade.portOfDischarge)
  const [spec, setSpec] = React.useState(trade.spec)
  const [reason, setReason] = React.useState("")

  const patch: W.ChangePatch | null = (() => {
    switch (kind) {
      case "quantity": {
        const value = Number(quantity)
        return value > 0 && value !== trade.qtyContractedMt ? { qtyContractedMt: value } : null
      }
      case "price": {
        const value = Number(price)
        return value > 0 && value !== trade.priceUsdPerMt ? { priceUsdPerMt: value } : null
      }
      case "date":
        return from && to && from <= to && (from !== trade.deliveryWindow[0] || to !== trade.deliveryWindow[1]) ? { deliveryWindow: [from, to] } : null
      case "destination":
        return port !== trade.portOfDischarge ? { portOfDischarge: port, destination: portName(port) } : null
      case "spec":
        return spec.trim() && spec.trim() !== trade.spec ? { spec: spec.trim() } : null
    }
  })()

  const assessment = patch ? assessChange(trade, kind, patch) : null

  const submit = () => {
    if (!patch || !assessment) return
    const { from: before, to: after } = describeChange(trade, kind, patch)
    perform(
      {
        kind: "raise-change",
        request: {
          tradeId: trade.id,
          kind,
          stage: trade.currentStage,
          from: before,
          to: after,
          patch,
          reason: reason.trim(),
          impact: assessment.impact,
          approverRole: assessment.approverRole,
        },
      },
      actor
    )
    toast.success("Change request raised", { description: `Waiting on ${W.roleById(assessment.approverRole).label}` })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Request a change</DialogTitle>
          <DialogDescription>
            {trade.id} is at stage {pad2(trade.currentStage)} {W.stageByNo(trade.currentStage).short}. The impact is assessed before it goes for approval —
            the later the change, the more it costs.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="What to change">
            {kinds.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={kind === option}
                onClick={() => setKind(option)}
                className={cn(
                  "h-8 rounded-full border px-3 text-[12.5px] font-semibold transition-colors",
                  kind === option ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground hover:bg-muted"
                )}
              >
                {KIND_LABEL[option]}
              </button>
            ))}
          </div>

          {kind === "quantity" ? (
            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
              New quantity (MT) <span className="font-normal text-muted-foreground">Now {trade.qtyContractedMt} MT</span>
              <Input type="number" min={0.1} step={0.1} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
            </label>
          ) : null}
          {kind === "price" ? (
            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
              New price (USD / MT) <span className="font-normal text-muted-foreground">Now USD {trade.priceUsdPerMt.toLocaleString("en-US")}</span>
              <Input type="number" min={1} value={price} onChange={(event) => setPrice(event.target.value)} />
            </label>
          ) : null}
          {kind === "date" ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
                Window opens
                <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
              </label>
              <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
                Window closes
                <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
              </label>
            </div>
          ) : null}
          {kind === "destination" ? (
            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
              Port of discharge
              <Select items={Object.fromEntries(PORTS.map((entry) => [entry, entry]))} value={port} onValueChange={(next) => next && setPort(String(next))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PORTS.map((entry) => (
                    <SelectItem key={entry} value={entry}>
                      {entry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          ) : null}
          {kind === "spec" ? (
            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
              Revised specification
              <Textarea rows={3} value={spec} onChange={(event) => setSpec(event.target.value)} />
            </label>
          ) : null}

          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
            Why
            <Textarea rows={2} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="What's driving the change?" />
          </label>

          {assessment ? (
            <ImpactSummary impact={assessment.impact} approverRole={assessment.approverRole} warnings={assessment.warnings} compact />
          ) : (
            <p className="rounded-2xl bg-muted px-4 py-3 text-[12.5px] text-muted-foreground">Enter a new value to see the impact.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!patch || !reason.trim()} onClick={submit}>
            Send for approval
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ── the four assessments ───────────────────────────────────────────── */

function ImpactSummary({
  impact,
  approverRole,
  warnings = [],
  compact = false,
}: {
  impact: W.ChangeImpact
  approverRole: W.InternalRoleId
  warnings?: string[]
  compact?: boolean
}) {
  const marginDelta = impact.marginAfterPct - impact.marginBeforePct
  return (
    <div className={cn("flex flex-col gap-3", !compact && "mt-4 border-t border-border pt-4")}>
      {warnings.length > 0 ? (
        <ul className="flex flex-col gap-1.5 rounded-2xl bg-status-warning/10 px-4 py-3">
          {warnings.map((warning) => (
            <li key={warning} className="flex items-start gap-2 text-[12.5px] text-status-warning">
              <AlertTriangleIcon aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              {warning}
            </li>
          ))}
        </ul>
      ) : null}
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        <div>
          <dt className="text-[12px] text-muted-foreground">Inventory</dt>
          <dd className="text-[13px] text-foreground">{impact.inventory}</dd>
        </div>
        <div>
          <dt className="text-[12px] text-muted-foreground">Logistics</dt>
          <dd className="text-[13px] text-foreground">{impact.logistics}</dd>
        </div>
        <div>
          <dt className="text-[12px] text-muted-foreground">Cost & margin</dt>
          <dd className="text-[13px] text-foreground tabular-nums">
            {impact.revenueUsd !== 0 ? <span>{impact.revenueUsd > 0 ? "+" : ""}{usd(impact.revenueUsd)} value · </span> : null}
            {impact.costUsd !== 0 ? <span>{usd(impact.costUsd)} cost · </span> : null}
            <span className={cn("font-semibold", marginDelta < -0.05 ? "text-destructive" : marginDelta > 0.05 ? "text-amama-deep" : "text-foreground")}>
              {impact.marginBeforePct.toFixed(1)}% → {impact.marginAfterPct.toFixed(1)}%
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-[12px] text-muted-foreground">Documents</dt>
          <dd className="flex flex-wrap gap-1 pt-0.5">
            {impact.documents.map((name) => (
              <Pill key={name} tone="muted">
                {name}
              </Pill>
            ))}
          </dd>
        </div>
      </dl>
      <p className="text-[12px] text-muted-foreground">Approval: {W.roleById(approverRole).label}</p>
    </div>
  )
}

/* ── one request ────────────────────────────────────────────────────── */

function ChainProgress({ status }: { status: W.ChangeStatus }) {
  const decided = status === "approved" || status === "rejected"
  return (
    <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
      {CHAIN_STEPS.map((step, index) => {
        const last = index === CHAIN_STEPS.length - 1
        const done = !last || status === "approved"
        const failed = last && (status === "rejected" || status === "withdrawn")
        return (
          <li key={step} className="flex items-center gap-1.5">
            {index > 0 ? <span aria-hidden className="h-px w-3 bg-border" /> : null}
            <span
              title={step}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                done ? "bg-amama-subtle text-amama-deep" : failed ? "bg-muted text-muted-foreground line-through" : "bg-status-warning/10 text-status-warning"
              )}
            >
              {done ? <CheckIcon aria-hidden className="size-3" /> : null}
              {last && (decided || status === "withdrawn") ? STATUS_LABEL[status] : step}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function DecisionDialog({
  open,
  onOpenChange,
  request,
  decision,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: W.ChangeRequest
  decision: "approved" | "rejected" | "withdrawn"
}) {
  const [note, setNote] = React.useState(
    decision === "approved" ? "Approved — revised trade plan issued." : decision === "withdrawn" ? "Withdrawn by the requester." : ""
  )
  const approver = W.INTERNAL_USERS.find((user) => user.role === request.approverRole)
  const actor: Actor =
    decision === "withdrawn" ? request.raisedBy : { party: "internal", id: approver?.id ?? "u-vikram" }
  const title = decision === "approved" ? "Approve change" : decision === "rejected" ? "Reject change" : "Withdraw request"
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {title} · {request.id}
          </DialogTitle>
          <DialogDescription>
            {KIND_LABEL[request.kind]}: {request.from} → {request.to}
            {decision === "approved" ? " — the trade is updated and a revised plan issued." : ""}
          </DialogDescription>
        </DialogHeader>
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
          {decision === "rejected" ? "Reason" : "Note"}
          <Textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
        {decision !== "withdrawn" ? <p className="text-[12px] text-muted-foreground">Recorded as {approver?.name} · {W.roleById(request.approverRole).label}</p> : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={decision === "approved" ? "default" : "destructive"}
            disabled={decision === "rejected" && !note.trim()}
            onClick={() => {
              perform({ kind: "decide-change", id: request.id, status: decision, note: note.trim() }, actor)
              toast.success(`${request.id} ${decision}`)
              onOpenChange(false)
            }}
          >
            {decision === "approved" ? "Approve" : decision === "rejected" ? "Reject" : "Withdraw"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ChangeCard({
  request,
  perspective,
  partyIds,
  showTrade = false,
}: {
  request: W.ChangeRequest
  perspective: TradePerspective
  partyIds: string[]
  showTrade?: boolean
}) {
  const [decision, setDecision] = React.useState<"approved" | "rejected" | "withdrawn" | null>(null)
  const pending = request.status === "awaiting-approval"
  const own =
    (perspective === "buyer" && request.raisedBy.party === "buyer") ||
    (perspective === "seller" && request.raisedBy.party === "seller" && partyIds.includes(request.raisedBy.id)) ||
    (perspective === "internal" && request.raisedBy.party === "internal")
  const trade = W.tradeById(request.tradeId)

  return (
    <section className="overflow-hidden rounded-[20px] border border-border bg-background">
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-4">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 text-[12px] text-muted-foreground">
            <Mono className="text-foreground">{request.id}</Mono>
            {showTrade && trade ? (
              <>
                <span aria-hidden>·</span>
                <Link href={`/internal/trade-desk/${trade.id}?tab=changes`} className="font-medium text-amama-deep hover:underline">
                  {trade.id} · {W.productById(trade.productId)?.label}
                </Link>
              </>
            ) : null}
            <span aria-hidden>·</span>
            <span>Stage {pad2(request.stage)} {W.stageByNo(request.stage).short}</span>
          </p>
          <h3 className="mt-1 text-[15px] font-semibold text-foreground">
            {KIND_LABEL[request.kind]}: <span className="font-normal text-muted-foreground line-through decoration-muted-foreground/50">{request.from.length > 60 ? `${request.from.slice(0, 60)}…` : request.from}</span>{" "}
            → {request.to.length > 80 ? `${request.to.slice(0, 80)}…` : request.to}
          </h3>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            {partyName(request.raisedBy.party, request.raisedBy.id)} · {formatStamp(request.raisedAt)}
          </p>
        </div>
        <Status tone={STATUS_TONE[request.status]}>{STATUS_LABEL[request.status]}</Status>
      </header>
      <div className="px-5 pt-3 pb-4">
        {request.reason ? <p className="text-[13px] text-foreground">{request.reason}</p> : null}
        <div className="mt-3">
          <ChainProgress status={request.status} />
        </div>
        <ImpactSummary impact={request.impact} approverRole={request.approverRole} />
        {request.decisionNote ? (
          <p className="mt-3 rounded-2xl bg-muted px-4 py-2.5 text-[12.5px] text-foreground">
            {request.decidedBy ? <span className="font-medium">{W.userById(request.decidedBy)?.name}: </span> : null}
            {request.decisionNote}
            {request.revisedPlan ? <span className="text-muted-foreground"> · {request.revisedPlan}</span> : null}
          </p>
        ) : null}
        {pending && (perspective === "internal" || own) ? (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
            {perspective === "internal" ? (
              <>
                <Button size="sm" onClick={() => setDecision("approved")}>
                  <CheckIcon aria-hidden />
                  Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => setDecision("rejected")}>
                  Reject
                </Button>
              </>
            ) : null}
            {own ? (
              <Button size="sm" variant="ghost" onClick={() => setDecision("withdrawn")}>
                Withdraw
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      {decision ? <DecisionDialog open onOpenChange={(open) => !open && setDecision(null)} request={request} decision={decision} /> : null}
    </section>
  )
}

/* ── the trade's Changes tab ────────────────────────────────────────── */

function ChangesTab({ trade, perspective, partyIds }: { trade: W.Trade; perspective: TradePerspective; partyIds: string[] }) {
  const [raising, setRaising] = React.useState(false)
  const requests = W.changeRequestsForTrade(trade.id)
  const actor = actorFor(trade, perspective, partyIds, trade.currentStage)
  const closed = trade.status === "closed"
  const pending = requests.filter((request) => request.status === "awaiting-approval")

  return (
    <div className="flex flex-col gap-4">
      <Panel
        title="Commercial changes"
        action={
          !closed ? (
            <Button size="sm" onClick={() => setRaising(true)}>
              <PlusIcon aria-hidden />
              Request change
            </Button>
          ) : null
        }
      >
        <p className="text-[13px] text-muted-foreground">
          {closed
            ? "This trade is closed — no further changes."
            : pending.length > 0
              ? `${pending.length} waiting on a decision. Approved changes update the contract and issue a revised trade plan.`
              : `Quantity, price, date, destination or spec. Raised now, at stage ${pad2(trade.currentStage)}, a change costs about ${(1 + (trade.currentStage - 1) / 5).toFixed(1)}× what it would have before signature.`}
        </p>
      </Panel>

      {requests.length === 0 ? (
        <EmptyNote>
          <GitPullRequestArrowIcon aria-hidden className="mx-auto mb-2 size-5" />
          No change requests on this trade
        </EmptyNote>
      ) : (
        requests.map((request) => <ChangeCard key={request.id} request={request} perspective={perspective} partyIds={partyIds} />)
      )}

      {/* Mounted per opening, so every request starts from the trade as it stands. */}
      {!closed && raising ? <RaiseChangeDialog open onOpenChange={setRaising} trade={trade} perspective={perspective} actor={actor} /> : null}
    </div>
  )
}

/* ── the internal book of changes ───────────────────────────────────── */

type Filter = "pending" | "decided" | "all"

function ChangeRequestsPage() {
  useLiveWorld()
  const [filter, setFilter] = React.useState<Filter>("pending")
  const all = [...W.CHANGE_REQUESTS].sort((a, b) => b.raisedAt.localeCompare(a.raisedAt))
  const pending = all.filter((request) => request.status === "awaiting-approval")
  const approved = all.filter((request) => request.status === "approved")
  const visible = filter === "pending" ? pending : filter === "decided" ? all.filter((request) => request.status !== "awaiting-approval") : all
  const marginAtStake = pending.reduce((sum, request) => sum + (request.impact.revenueUsd - request.impact.costUsd), 0)

  return (
    <div className={PAGE_TABS_SPACE}>
      <Link href="/internal/trade-desk" className="text-[13px] font-medium text-muted-foreground hover:text-foreground">
        ← Trades
      </Link>
      <h1 className="mt-2 text-[28px] leading-tight font-semibold tracking-[-0.028em]">Change requests</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">Scenario E across the book — every quantity, price, date, destination and spec change, and who decided it.</p>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Awaiting approval" value={pending.length} tone={pending.length > 0 ? "warning" : "plain"} caption="Need a decision" />
        <StatTile label="Approved" value={approved.length} tone="brand" caption="Revised plans issued" />
        <StatTile label="Value in play" value={usd(marginAtStake)} caption="Pending, net of change cost" />
        <StatTile label="Trades touched" value={new Set(all.map((request) => request.tradeId)).size} caption={`of ${W.TRADES.length}`} />
      </div>

      <PageTabs
        label="Filter"
        className="mt-5"
        value={filter}
        onChange={setFilter}
        tabs={[
          { value: "pending", label: "Awaiting", count: pending.length },
          { value: "decided", label: "Decided" },
          { value: "all", label: "All" },
        ]}
      />

      <div className="mt-4 flex flex-col gap-4">
        {visible.length === 0 ? (
          <EmptyNote>Nothing here</EmptyNote>
        ) : (
          visible.map((request) => <ChangeCard key={request.id} request={request} perspective="internal" partyIds={[]} showTrade />)
        )}
      </div>
    </div>
  )
}

export { ChangeRequestsPage, ChangesTab }
