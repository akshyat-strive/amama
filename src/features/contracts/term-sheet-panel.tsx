"use client"

import * as React from "react"
import { AlertTriangleIcon, CheckIcon, ClockIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  disputeClause,
  proposeClause,
  type ClauseStatus,
  type Contract,
  type TermSheetClause,
} from "@/features/contracts/contract-store"
import type { ChatParty } from "@/features/marketplace/conversation-store"

const statusCopy: Record<ClauseStatus, { label: string; icon: typeof CheckIcon; className: string }> = {
  pending: { label: "Pending", icon: ClockIcon, className: "bg-status-warning/15 text-status-warning" },
  agreed: { label: "Agreed", icon: CheckIcon, className: "bg-amama-subtle text-amama-deep" },
  disputed: { label: "Disputed", icon: AlertTriangleIcon, className: "bg-destructive/10 text-destructive" },
}

/**
 * The clause-by-clause negotiation surface a `term-sheet` card opens into.
 * Every clause is its own small negotiation: whoever's reading (buyer or
 * seller) can put a value on the table or dispute it back to the KAM; a
 * KAM reads the same list without those actions, since mediating happens
 * back in the chat, not by proposing on either side's behalf.
 */
function TermSheetPanel({
  open,
  onOpenChange,
  contract,
  viewer,
  viewerName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contract: Contract
  viewer: ChatParty
  viewerName: string
}) {
  const isTrader = viewer === "buyer" || viewer === "seller"
  const counterpartName = viewer === "buyer" ? contract.sellerName : viewer === "seller" ? contract.buyerName : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Term sheet — {contract.reference}</DialogTitle>
          <DialogDescription>
            {isTrader
              ? `Agree each clause with ${counterpartName}. Changing a value either of you already agreed on reopens it — that's a fresh counter-offer, not an edit.`
              : "Every clause both sides are working through."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {contract.clauses.map((clause) => (
            <ClauseRow
              key={clause.id}
              contractId={contract.id}
              clause={clause}
              viewer={viewer}
              viewerName={viewerName}
              isTrader={isTrader}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ClauseRow({
  contractId,
  clause,
  viewer,
  viewerName,
  isTrader,
}: {
  contractId: string
  clause: TermSheetClause
  viewer: ChatParty
  viewerName: string
  isTrader: boolean
}) {
  const [draft, setDraft] = React.useState(clause.value ?? "")
  const copy = statusCopy[clause.status]
  const myLastProposal = [...clause.proposals].reverse().find((entry) => entry.by === viewer)

  return (
    <div className="rounded-2xl border border-border bg-card p-3.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-bold text-foreground">{clause.label}</p>
        <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", copy.className)}>
          <copy.icon className="size-3" />
          {copy.label}
        </span>
      </div>

      <p className="mt-1 text-[13px] text-muted-foreground">{clause.value ? clause.value : "Not proposed yet"}</p>

      {clause.linkedMessageText ? (
        <p className="mt-1.5 rounded-xl bg-muted px-2.5 py-1.5 text-[11px] text-muted-foreground">
          From chat: “{clause.linkedMessageText}”
        </p>
      ) : null}

      {isTrader ? (
        <div className="mt-2.5 flex items-center gap-2">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Propose a value…"
            className="h-8 text-[12px]"
          />
          <Button
            size="sm"
            className="h-8 shrink-0 px-3"
            disabled={!draft.trim() || (draft.trim() === myLastProposal?.value && clause.status !== "disputed")}
            onClick={() => proposeClause(contractId, clause.id, draft.trim(), viewer, viewerName)}
          >
            {clause.value ? "Send" : "Propose"}
          </Button>
          {clause.status !== "disputed" ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 shrink-0 px-2 text-destructive"
              onClick={() => disputeClause(contractId, clause.id, viewer, viewerName, null)}
            >
              Dispute
            </Button>
          ) : null}
        </div>
      ) : null}

      {clause.proposals.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-0.5 text-[11px] text-muted-foreground">
          {clause.proposals
            .slice(-3)
            .reverse()
            .map((proposal, index) => (
              <li key={index}>
                <span className="font-medium text-foreground">{proposal.byName}</span>: {proposal.value}
              </li>
            ))}
        </ul>
      ) : null}
    </div>
  )
}

export { TermSheetPanel }
