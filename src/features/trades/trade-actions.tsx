"use client"

import * as React from "react"
import { CheckIcon, PaperclipIcon, RotateCcwIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import * as W from "@/features/tradechain/demo-world"
import { documentRegister, stageStateFor } from "@/features/tradechain/trade-file"
import {
  actorName,
  isTaskDone,
  liveActionCount,
  ownerFor,
  perform,
  resetLiveWorld,
  type Actor,
} from "@/features/tradechain/live-world"
import { STAGE_ACTIONS, canUpload, type StageDecision } from "@/features/trades/stage-actions"
import type { TradePerspective } from "@/features/trades/trade-access"
import { formatStamp, pad2 } from "@/features/trades/trade-format"
import { Panel, Pill, Status } from "@/features/trades/trade-ui"

const PARTY_LABEL: Record<TradePerspective, string> = { internal: "AMAMA", buyer: "Buyer", seller: "Grower" }

/** Who an action is recorded against. Internal actions are logged as the
 *  stage's owner — the person whose job the click stands in for. */
function actorFor(trade: W.Trade, perspective: TradePerspective, partyIds: string[], stage: W.StageNo): Actor {
  if (perspective === "buyer") return { party: "buyer", id: trade.buyerId }
  if (perspective === "seller") return { party: "seller", id: trade.sellerIds.find((id) => partyIds.includes(id)) ?? trade.sellerIds[0] }
  return { party: "internal", id: ownerFor(stage, trade.id) }
}

/** A stage can be worked while it is the trade's live edge, or while it
 *  runs in parallel with it (booking and document control often do). */
function isWorkable(trade: W.Trade, stage: W.StageNo): boolean {
  if (trade.status === "closed") return false
  const state = stageStateFor(trade, stage)
  return stage === trade.currentStage || state === "in-progress" || state === "blocked"
}

const isOpen = (document: W.TradeDocument) =>
  document.requirement === "M" && document.status !== "VERIFIED" && document.status !== "NA"

/* ── small pieces ───────────────────────────────────────────────────── */

function SmallButton({
  tone = "neutral",
  className,
  ...props
}: React.ComponentProps<"button"> & { tone?: "neutral" | "primary" | "danger" }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-40",
        tone === "primary" && "border-transparent bg-primary text-primary-foreground hover:bg-amama-deep-hover",
        tone === "neutral" && "border-border bg-card text-foreground hover:bg-muted",
        tone === "danger" && "border-destructive/30 bg-card text-destructive hover:bg-destructive/5",
        className
      )}
      {...props}
    />
  )
}

function NoteDialog({
  open,
  onOpenChange,
  title,
  description,
  initial,
  confirm,
  danger,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  initial: string
  confirm: string
  danger?: boolean
  onConfirm: (note: string) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Mounted per opening, so the note starts from `initial` every time. */}
      {open ? (
        <NoteDialogBody
          onOpenChange={onOpenChange}
          title={title}
          description={description}
          initial={initial}
          confirm={confirm}
          danger={danger}
          onConfirm={onConfirm}
        />
      ) : null}
    </Dialog>
  )
}

function NoteDialogBody({
  onOpenChange,
  title,
  description,
  initial,
  confirm,
  danger,
  onConfirm,
}: {
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  initial: string
  confirm: string
  danger?: boolean
  onConfirm: (note: string) => void
}) {
  const [note, setNote] = React.useState(initial)
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
        Note
        <Textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} />
      </label>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          variant={danger ? "destructive" : "default"}
          disabled={!note.trim()}
          onClick={() => {
            onConfirm(note.trim())
            onOpenChange(false)
          }}
        >
          {confirm}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

/* ── documents ──────────────────────────────────────────────────────── */

/** Verify / reject / upload on one document row. Nothing is uploaded
 *  anywhere — the file name is kept on the record as evidence it was. */
function DocumentActions({
  trade,
  document,
  perspective,
  partyIds,
}: {
  trade: W.Trade
  document: W.TradeDocument
  perspective: TradePerspective
  partyIds: string[]
}) {
  const fileInput = React.useRef<HTMLInputElement>(null)
  const [rejecting, setRejecting] = React.useState(false)
  if (trade.status === "closed" || document.stage > trade.currentStage) return null
  const actor = actorFor(trade, perspective, partyIds, document.stage)
  const internal = perspective === "internal"
  const settled = document.status === "VERIFIED" || document.status === "NA"
  const uploadable = !settled && canUpload(perspective, document.issuer) && (internal ? document.status !== "PENDING" : true)

  const act = (status: W.DocStatus, note?: string) => {
    perform({ kind: "document", tradeId: trade.id, stage: document.stage, name: document.name, status, note }, actor)
    const verb = status === "VERIFIED" ? "verified" : status === "REJECTED" ? "rejected" : status === "NA" ? "marked not applicable" : "uploaded"
    toast.success(`${document.name} ${verb}`)
  }

  return (
    <span className="flex flex-wrap items-center justify-end gap-1.5">
      {uploadable ? (
        <>
          <input
            ref={fileInput}
            type="file"
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (!file) return
              act("PENDING", `${file.name} uploaded by ${actorName(actor)} — awaiting verification.`)
              event.target.value = ""
            }}
          />
          <SmallButton onClick={() => fileInput.current?.click()}>
            <PaperclipIcon aria-hidden className="size-3.5" />
            {document.status === "PENDING" && !internal ? "Replace" : "Upload"}
          </SmallButton>
        </>
      ) : null}
      {internal && !settled ? (
        <>
          <SmallButton tone="primary" onClick={() => act("VERIFIED")}>
            <CheckIcon aria-hidden className="size-3.5" />
            Verify
          </SmallButton>
          {document.status !== "REJECTED" ? (
            <SmallButton tone="danger" onClick={() => setRejecting(true)}>
              Reject
            </SmallButton>
          ) : null}
          {document.requirement === "O" ? <SmallButton onClick={() => act("NA")}>N/A</SmallButton> : null}
        </>
      ) : null}
      <NoteDialog
        open={rejecting}
        onOpenChange={setRejecting}
        title={`Reject ${document.name}`}
        description="The document goes RED and the gate it holds stays shut until a corrected copy is verified."
        initial="Details do not match the trade record — corrected copy requested."
        confirm="Reject"
        danger
        onConfirm={(note) => act("REJECTED", `Rejected by ${actorName(actor)}: ${note}`)}
      />
    </span>
  )
}

/* ── claims (stage 15, chain C) ─────────────────────────────────────── */

const CLAIM_REASONS: Record<W.ClaimReason, string> = {
  quality: "Quality below spec",
  quantity: "Short delivery",
  temperature: "Temperature abuse",
  damage: "Physical damage",
  documents: "Wrong or missing documents",
}

function ClaimDialog({
  open,
  onOpenChange,
  trade,
  actor,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  trade: W.Trade
  actor: Actor
}) {
  const [reason, setReason] = React.useState<W.ClaimReason>("quality")
  const [affected, setAffected] = React.useState("1")
  const [amount, setAmount] = React.useState("")
  const [photos, setPhotos] = React.useState(0)
  const [detail, setDetail] = React.useState("")
  const mt = Number(affected)
  const suggested = Math.round(mt * trade.priceUsdPerMt)
  const claimed = amount ? Number(amount) : suggested

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Raise a claim</DialogTitle>
          <DialogDescription>
            Opens chain C at stage 15. Evidence is collected, the cause traced back through the lot chain, and
            AMAMA resolves it as a credit, a replacement or a rejection.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
            Reason
            <Select items={CLAIM_REASONS} value={reason} onValueChange={(next) => next && setReason(next as W.ClaimReason)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CLAIM_REASONS) as W.ClaimReason[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {CLAIM_REASONS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
              Affected (MT)
              <Input type="number" min={0.1} step={0.1} value={affected} onChange={(event) => setAffected(event.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
              Claim (USD)
              <Input type="number" min={0} placeholder={String(suggested)} value={amount} onChange={(event) => setAmount(event.target.value)} />
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
            What did you find?
            <Textarea rows={3} value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="e.g. Aril breakdown on pallets 3 and 7, 4% of fruit sampled." />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border px-4 py-3 text-[13px] text-muted-foreground">
            <span className="flex items-center gap-2">
              <PaperclipIcon aria-hidden className="size-4" />
              {photos > 0 ? `${photos} photo${photos === 1 ? "" : "s"} attached` : "Attach photo evidence"}
            </span>
            <input type="file" accept="image/*" multiple className="text-[12px]" onChange={(event) => setPhotos(event.target.files?.length ?? 0)} />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!(mt > 0) || !detail.trim()}
            onClick={() => {
              perform(
                { kind: "raise-claim", claim: { tradeId: trade.id, reason, detail: detail.trim(), affectedMt: mt, claimedUsd: claimed, photos } },
                actor
              )
              toast.error("Claim raised — AMAMA has been notified")
              onOpenChange(false)
            }}
          >
            Raise claim
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const CLAIM_STATUS_TONE: Record<W.ClaimStatus, "ok" | "warn" | "crit" | "muted"> = {
  open: "crit",
  "under-review": "warn",
  settled: "ok",
  rejected: "muted",
}

function SettleClaimDialog({ claim, trade, open, onOpenChange }: { claim: W.Claim; trade: W.Trade; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [resolution, setResolution] = React.useState<"credit" | "replacement" | "rejected">("credit")
  const [amount, setAmount] = React.useState(String(claim.claimedUsd))
  const [cause, setCause] = React.useState("")
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve {claim.id}</DialogTitle>
          <DialogDescription>Record what the traceability chain showed and how the claim closes.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-1.5">
            {(["credit", "replacement", "rejected"] as const).map((option) => (
              <SmallButton key={option} tone={resolution === option ? "primary" : "neutral"} onClick={() => setResolution(option)} className="justify-center capitalize">
                {option === "rejected" ? "Reject" : option}
              </SmallButton>
            ))}
          </div>
          {resolution !== "rejected" ? (
            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
              Settled (USD)
              <Input type="number" min={0} value={amount} onChange={(event) => setAmount(event.target.value)} />
            </label>
          ) : null}
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
            Root cause
            <Textarea rows={3} value={cause} onChange={(event) => setCause(event.target.value)} placeholder="e.g. Traced to the conditional lot at stage 03 — sunscald at the clause limit." />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!cause.trim()}
            onClick={() => {
              perform(
                { kind: "decide-claim", id: claim.id, resolution, settledUsd: resolution === "rejected" ? 0 : Number(amount) || 0, note: cause.trim() },
                { party: "internal", id: W.stageRecord(trade.id, 15)?.ownerId ?? trade.kamId }
              )
              toast.success(`${claim.id} ${resolution === "rejected" ? "rejected" : "settled"}`)
              onOpenChange(false)
            }}
          >
            Resolve claim
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ClaimRow({ claim, trade, perspective }: { claim: W.Claim; trade: W.Trade; perspective: TradePerspective }) {
  const [settling, setSettling] = React.useState(false)
  return (
    <li className="flex flex-wrap items-start gap-3 px-5 py-3">
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[13px] font-medium text-foreground">
          {claim.id} · {CLAIM_REASONS[claim.reason]}
        </span>
        <span className="mt-0.5 block text-[12.5px] text-foreground">{claim.detail}</span>
        <span className="mt-0.5 block text-[12px] text-muted-foreground tabular-nums">
          {claim.affectedMt} MT · USD {claim.claimedUsd.toLocaleString("en-US")} claimed · {claim.photos} photos · {formatStamp(claim.raisedAt)}
        </span>
        {claim.rootCause ? <span className="mt-1 block text-[12px] text-muted-foreground">Root cause: {claim.rootCause}</span> : null}
        {claim.settledUsd !== null && claim.status === "settled" ? (
          <span className="mt-0.5 block text-[12px] text-amama-deep">
            Settled by {claim.resolution} · USD {claim.settledUsd.toLocaleString("en-US")}
          </span>
        ) : null}
      </span>
      <span className="flex items-center gap-2">
        <Status tone={CLAIM_STATUS_TONE[claim.status]}>{claim.status === "under-review" ? "Under review" : claim.status[0].toUpperCase() + claim.status.slice(1)}</Status>
        {perspective === "internal" && (claim.status === "open" || claim.status === "under-review") ? (
          <SmallButton tone="primary" onClick={() => setSettling(true)}>
            Resolve
          </SmallButton>
        ) : null}
      </span>
      {perspective === "internal" ? <SettleClaimDialog claim={claim} trade={trade} open={settling} onOpenChange={setSettling} /> : null}
    </li>
  )
}

function ClaimsPanel({ trade, perspective }: { trade: W.Trade; perspective: TradePerspective }) {
  const claims = W.claimsForTrade(trade.id)
  if (claims.length === 0) return null
  return (
    <Panel title="Claims" action={<span className="text-[12px] text-muted-foreground tabular-nums">{claims.length}</span>} flush>
      <ul className="divide-y divide-border">
        {claims.map((claim) => (
          <ClaimRow key={claim.id} claim={claim} trade={trade} perspective={perspective} />
        ))}
      </ul>
    </Panel>
  )
}

/* ── the stage's own actions ────────────────────────────────────────── */

function StageActionsPanel({
  trade,
  stageNo,
  perspective,
  partyIds,
}: {
  trade: W.Trade
  stageNo: W.StageNo
  perspective: TradePerspective
  partyIds: string[]
}) {
  const [flagging, setFlagging] = React.useState<StageDecision | null>(null)
  const [resolving, setResolving] = React.useState(false)
  const [claiming, setClaiming] = React.useState(false)
  const [resetting, setResetting] = React.useState(false)

  if (!isWorkable(trade, stageNo)) return null

  const spec = STAGE_ACTIONS[stageNo]
  const stage = W.stageByNo(stageNo)
  const record = W.stageRecord(trade.id, stageNo)
  const state = stageStateFor(trade, stageNo)
  const actor = actorFor(trade, perspective, partyIds, stageNo)
  const documents = documentRegister(trade).filter((document) => document.stage === stageNo)
  const openDocuments = documents.filter(isOpen)
  const mine = spec.tasks.filter((task) => task.by === perspective)
  const pendingTasks = mine.filter((task) => !isTaskDone(trade.id, stageNo, task.id))
  const decisions = spec.decisions.filter((decision) => decision.by.includes(perspective))
  const canClose = spec.completeBy.includes(perspective)
  const blocked = state === "blocked"
  const issueOpen = blocked || (record?.scenario !== "A" && record?.scenario !== "E" && trade.status !== "active")
  const ready = canClose && pendingTasks.length === 0 && openDocuments.length === 0 && !blocked

  const reasons = [
    pendingTasks.length > 0 ? `${pendingTasks.length} task${pendingTasks.length === 1 ? "" : "s"} to tick` : null,
    openDocuments.length > 0
      ? `${openDocuments.length} document${openDocuments.length === 1 ? "" : "s"} to ${perspective === "internal" ? "verify" : "sign"}`
      : null,
    blocked ? "resolve the open issue" : null,
  ].filter(Boolean)

  const complete = (note?: string) => {
    perform({ kind: "complete-stage", tradeId: trade.id, stage: stageNo, note }, actor)
    toast.success(stageNo === 16 ? "Trade closed" : `Stage ${pad2(stageNo)} complete`, {
      description: stageNo < 16 ? `Moved to ${pad2(Math.min(16, stageNo + 1))} ${W.stageByNo(Math.min(16, stageNo + 1) as W.StageNo).short}` : undefined,
    })
  }

  const decide = (decision: StageDecision) => {
    const effect = decision.effect
    if (effect.kind === "flag") return setFlagging(decision)
    if (effect.kind === "claim") return setClaiming(true)
    if (effect.kind === "complete") return complete(effect.note)
    if (effect.kind === "note") {
      perform({ kind: "note", tradeId: trade.id, stage: stageNo, summary: `${effect.summary} — ${actorName(actor)}` }, actor)
      toast.success(decision.label)
      return
    }
    for (const name of effect.names) {
      perform({ kind: "document", tradeId: trade.id, stage: stageNo, name, status: effect.status, note: effect.note }, actor)
    }
    toast.success(decision.label)
  }

  const visibleTasks = spec.tasks.filter((task) => task.by === perspective || perspective === "internal")
  const showDecisions = decisions.filter((decision) => {
    const effect = decision.effect
    if (effect.kind === "complete") return ready
    // A sign-off whose documents are already on file has nothing left to do.
    if (effect.kind === "documents") {
      return effect.names.some((name) => documents.find((document) => document.name === name)?.status !== effect.status)
    }
    return true
  })

  return (
    <Panel
      title="Actions"
      action={
        <span className="truncate text-[12px] text-muted-foreground">
          {perspective === "internal" ? `As ${actorName(actor)} · ${W.roleById(stage.ownerRole).label}` : `As ${actorName(actor)}`}
        </span>
      }
    >
      {visibleTasks.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {visibleTasks.map((task) => {
            const done = isTaskDone(trade.id, stageNo, task.id)
            const own = task.by === perspective
            return (
              <li key={task.id}>
                <button
                  type="button"
                  disabled={!own}
                  aria-pressed={done}
                  onClick={() => perform({ kind: "task", tradeId: trade.id, stage: stageNo, taskId: task.id, label: task.label, done: !done }, actor)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-[12px] px-2 py-1.5 text-start transition-colors",
                    own ? "hover:bg-muted" : "cursor-default"
                  )}
                >
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-md border",
                      done ? "border-amama-deep bg-amama-deep text-white" : "border-border bg-card"
                    )}
                  >
                    {done ? <CheckIcon aria-hidden className="size-3.5" /> : null}
                  </span>
                  <span className={cn("min-w-0 flex-1 text-[13px]", done ? "text-muted-foreground line-through" : "text-foreground")}>{task.label}</span>
                  {task.by !== perspective ? <Pill tone="muted">{PARTY_LABEL[task.by]}</Pill> : null}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}

      {openDocuments.length > 0 ? (
        <p className="mt-3 text-[12.5px] text-muted-foreground">
          {perspective === "internal"
            ? `${openDocuments.length} mandatory document${openDocuments.length === 1 ? "" : "s"} open below — verify them to clear the gate.`
            : `${openDocuments.length} document${openDocuments.length === 1 ? "" : "s"} still to sign.`}
        </p>
      ) : null}

      <div className={cn("flex flex-wrap items-center gap-2", (visibleTasks.length > 0 || openDocuments.length > 0) && "mt-4 border-t border-border pt-4")}>
        {canClose ? (
          <Button size="sm" disabled={!ready} onClick={() => complete()}>
            <CheckIcon aria-hidden />
            {spec.complete}
          </Button>
        ) : null}
        {showDecisions.map((decision) => (
          <SmallButton key={decision.id} tone={decision.tone === "danger" ? "danger" : "neutral"} onClick={() => decide(decision)}>
            {decision.label}
          </SmallButton>
        ))}
        {perspective === "internal" && issueOpen ? (
          <SmallButton onClick={() => setResolving(true)}>Resolve issue</SmallButton>
        ) : null}
      </div>
      {canClose && !ready && reasons.length > 0 ? (
        <p className="mt-2 text-[12px] text-muted-foreground">To close: {reasons.join(" · ")}</p>
      ) : null}
      {!canClose && decisions.length === 0 && mine.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">{W.roleById(stage.ownerRole).label} is on this — nothing needed from you.</p>
      ) : null}

      <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-muted-foreground">
        Demo — actions are saved in this browser only.
        {liveActionCount() > 0 ? (
          <button type="button" onClick={() => setResetting(true)} className="inline-flex items-center gap-1 font-medium text-amama-deep hover:underline">
            <RotateCcwIcon aria-hidden className="size-3" />
            Reset demo
          </button>
        ) : null}
      </p>

      {flagging && flagging.effect.kind === "flag" ? (
        <NoteDialog
          open
          onOpenChange={(open) => !open && setFlagging(null)}
          title={`${flagging.label} · chain ${flagging.effect.scenario}`}
          description={stage.scenarios[flagging.effect.scenario].steps.join(" → ")}
          initial={flagging.effect.note}
          confirm="Open chain"
          danger={flagging.effect.scenario !== "B"}
          onConfirm={(note) => {
            if (flagging.effect.kind !== "flag") return
            perform({ kind: "flag", tradeId: trade.id, stage: stageNo, scenario: flagging.effect.scenario, note }, actor)
            toast.warning(`Chain ${flagging.effect.scenario} opened at stage ${pad2(stageNo)}`)
          }}
        />
      ) : null}
      <NoteDialog
        open={resolving}
        onOpenChange={setResolving}
        title="Resolve issue"
        description="Logs the resolution to the audit trail and puts the stage back in progress."
        initial="Recovery plan executed — back on track."
        confirm="Resolve"
        onConfirm={(note) => {
          perform({ kind: "resolve", tradeId: trade.id, stage: stageNo, note }, actor)
          toast.success("Issue resolved")
        }}
      />
      {stageNo === 15 ? <ClaimDialog open={claiming} onOpenChange={setClaiming} trade={trade} actor={actor} /> : null}
      <Dialog open={resetting} onOpenChange={setResetting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset the demo?</DialogTitle>
            <DialogDescription>
              Clears the {liveActionCount()} action{liveActionCount() === 1 ? "" : "s"} saved in this browser and puts every trade back to the seed data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetting(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                resetLiveWorld()
                setResetting(false)
                toast.success("Demo reset")
              }}
            >
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  )
}

/* ── activity ───────────────────────────────────────────────────────── */

function actorLabel(id: string | null): string {
  if (!id) return "System"
  return W.userById(id)?.name ?? W.buyerById(id)?.company ?? W.sellerById(id)?.entity ?? id
}

function StageActivity({ trade, stageNo }: { trade: W.Trade; stageNo: W.StageNo }) {
  const events = W.EVENTS.filter((event) => event.tradeId === trade.id && event.stage === stageNo).sort((a, b) => b.at.localeCompare(a.at))
  if (events.length === 0) return null
  return (
    <Panel title="Activity" action={<span className="text-[12px] text-muted-foreground tabular-nums">{events.length}</span>} flush>
      <ol className="divide-y divide-border">
        {events.slice(0, 12).map((event) => (
          <li key={event.id} className="flex items-start gap-3 px-5 py-2.5">
            <span className="w-[6.5rem] shrink-0 text-[12px] text-muted-foreground tabular-nums">{formatStamp(event.at)}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] text-foreground">{event.summary}</span>
              <span className="block text-[11.5px] text-muted-foreground">{actorLabel(event.actorId)}</span>
            </span>
          </li>
        ))}
      </ol>
    </Panel>
  )
}

export { ClaimsPanel, DocumentActions, StageActionsPanel, StageActivity, actorFor, isWorkable }
