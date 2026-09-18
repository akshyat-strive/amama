"use client"

import * as React from "react"
import {
  ArrowLeftRightIcon,
  CheckIcon,
  HandshakeIcon,
  MessageSquareIcon,
  SendIcon,
  XIcon,
} from "lucide-react"

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
import { Textarea } from "@/components/ui/textarea"
import type { ChatParty, ConversationCard } from "@/features/marketplace/conversation-store"
import { CardShell, Figure, type CardTone } from "@/features/marketplace/chat-card-shell"
import { formatInr } from "@/features/marketplace/currency"
import { DealTermsDialog } from "@/features/marketplace/deal-terms-dialog"
import {
  commentOnRound,
  confirmDeal,
  counterProposal,
  declineDeal,
  useDeals,
  type NegotiationRound,
} from "@/features/marketplace/deal-store"
import { ContractChatCard } from "@/features/contracts/contract-chat-cards"

const outcomeCopy = {
  accepted: { icon: CheckIcon, className: "text-amama-deep", label: "Accepted" },
  declined: { icon: XIcon, className: "text-destructive", label: "Declined" },
  countered: { icon: ArrowLeftRightIcon, className: "text-muted-foreground", label: "Countered" },
} as const

/**
 * One offer, and everything you can do about it. This is the widget the
 * whole buyer↔seller negotiation runs through: the numbers, the outcome
 * once there is one, the questions asked along the way, and — for whoever
 * is being asked — the three buttons that move it on.
 */
function ProposalCard({
  dealId,
  roundId,
  viewer,
  viewerName,
}: {
  dealId: string
  roundId: string
  viewer: ChatParty
  viewerName: string
}) {
  const deals = useDeals()
  const [countering, setCountering] = React.useState(false)
  const [declining, setDeclining] = React.useState(false)

  const deal = deals.find((entry) => entry.id === dealId)
  const round = deal?.rounds.find((entry) => entry.id === roundId)
  if (!deal || !round) return null

  const isTrader = viewer === "buyer" || viewer === "seller"
  // You answer the other side's offer, never your own.
  const canRespond = isTrader && round.outcome === "pending" && round.by !== viewer
  const waiting = isTrader && round.outcome === "pending" && round.by === viewer
  const counterpartName = round.by === "buyer" ? deal.sellerName : deal.buyerName
  const total = round.pricePerTonneUsd * round.quantityMt

  const tone: CardTone =
    round.outcome === "accepted" ? "success" : round.outcome === "declined" ? "danger" : "brand"
  const canAccept = round.outcome === "pending" && canRespond

  return (
    <>
      <CardShell
        icon={HandshakeIcon}
        tone={tone}
        title={`${round.byName} proposed`}
        subtitle={deal.listingTitle}
        footer={
          <div className="flex flex-col gap-2.5">
            {round.outcome === "pending" ? (
              canRespond ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setCountering(true)}>
                    <ArrowLeftRightIcon className="size-4" />
                    Counter
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-destructive"
                    onClick={() => setDeclining(true)}
                  >
                    <XIcon className="size-4" />
                    Decline
                  </Button>
                </div>
              ) : (
                <p className="text-[12px] font-medium text-muted-foreground">
                  {waiting ? `Waiting for ${counterpartName} to respond…` : "Awaiting a response."}
                </p>
              )
            ) : (
              <OutcomeLine round={round} />
            )}

            <RoundComments dealId={deal.id} round={round} viewer={viewer} viewerName={viewerName} />
          </div>
        }
      >
        {/* The number that matters most, bare and bold — no box, no
            tinted band, the same treatment a clean dashboard gives its
            one headline figure. Accept sits right beside it, since it's
            the one action that answers this exact number. */}
        <div className="flex items-end justify-between gap-3">
          <Figure label="Total value" value={formatInr(total)} size="hero" />
          {canAccept ? (
            <Button size="sm" className="shrink-0" onClick={() => confirmDeal(deal.id, viewer, viewerName)}>
              <CheckIcon className="size-4" />
              Accept
            </Button>
          ) : null}
        </div>

        <div className="mt-3.5 grid grid-cols-3 gap-3 border-t border-border pt-3.5">
          <Figure label="Price" value={`${formatInr(round.pricePerTonneUsd)}/t`} />
          <Figure label="Quantity" value={`${round.quantityMt} MT`} />
          <Figure label="Terms" value={round.incoterm ?? "—"} hint={round.deliveryWindow} />
        </div>

        {round.note ? (
          <p className="mt-2.5 rounded-2xl bg-muted px-3 py-2 text-[13px] leading-relaxed text-foreground">
            “{round.note}”
          </p>
        ) : null}
      </CardShell>

      <DealTermsDialog
        open={countering}
        onOpenChange={setCountering}
        title="Counter this offer"
        description={`Send ${round.byName} different terms. They can accept, counter again, or decline.`}
        initial={{
          pricePerTonneUsd: round.pricePerTonneUsd,
          quantityMt: round.quantityMt,
          incoterm: round.incoterm,
          deliveryWindow: round.deliveryWindow,
        }}
        submitLabel="Send counter offer"
        onSubmit={(terms) => {
          if (!isTrader) return
          counterProposal(deal.id, viewer, viewerName, terms)
        }}
      />

      <DeclineDialog
        open={declining}
        onOpenChange={setDeclining}
        counterpartName={round.byName}
        onConfirm={(reason) => {
          if (!isTrader) return
          declineDeal(deal.id, viewer, viewerName, reason)
        }}
      />
    </>
  )
}

function OutcomeLine({ round }: { round: NegotiationRound }) {
  if (round.outcome === "pending") return null
  const copy = outcomeCopy[round.outcome]
  return (
    <div className={cn("flex items-start gap-1.5 text-[12px] font-semibold", copy.className)}>
      <copy.icon className="mt-px size-3.5 shrink-0" />
      <span>
        {copy.label}
        {round.outcomeBy ? ` by ${round.outcomeBy}` : ""}
        {round.outcomeNote ? ` — ${round.outcomeNote}` : ""}
      </span>
    </div>
  )
}

/**
 * Questions about an offer, kept attached to the offer. Collapsed to a
 * count by default so a busy thread stays readable, because most rounds
 * get no questions at all.
 */
function RoundComments({
  dealId,
  round,
  viewer,
  viewerName,
}: {
  dealId: string
  round: NegotiationRound
  viewer: ChatParty
  viewerName: string
}) {
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState("")

  const submit = () => {
    const text = draft.trim()
    if (!text) return
    commentOnRound(dealId, round.id, viewer, viewerName, text)
    setDraft("")
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground"
      >
        <MessageSquareIcon className="size-3.5" />
        {round.comments.length > 0
          ? `${round.comments.length} ${round.comments.length === 1 ? "question" : "questions"}`
          : "Ask a question"}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-muted p-2.5">
      {round.comments.map((comment) => (
        <div key={comment.id} className="text-[12px] leading-relaxed">
          <span className="font-semibold text-foreground">{comment.byName}</span>{" "}
          <span className="text-muted-foreground">{comment.text}</span>
        </div>
      ))}
      <form
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
        className="flex items-center gap-1.5"
      >
        <input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask about these terms…"
          className="h-8 min-w-0 flex-1 rounded-full border border-border bg-card px-3 text-[12px] outline-none placeholder:text-muted-foreground focus-visible:border-ring"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label="Post question"
          className="grid size-8 shrink-0 place-items-center rounded-full bg-amama-deep text-white disabled:opacity-40"
        >
          <SendIcon className="size-3.5 rtl:-scale-x-100" />
        </button>
      </form>
    </div>
  )
}

/** Declining ends the deal, so it asks why — the reason is what lets the
 *  other side come back with something workable instead of guessing. */
function DeclineDialog({
  open,
  onOpenChange,
  counterpartName,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  counterpartName: string
  onConfirm: (reason: string | null) => void
}) {
  const [reason, setReason] = React.useState("")

  // Cleared on the way out rather than on the way in, so the next open
  // always starts blank without needing an effect to notice it opened.
  const handleOpenChange = (next: boolean) => {
    if (!next) setReason("")
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Decline this offer</DialogTitle>
          <DialogDescription>
            This ends the deal. If you just want different numbers, counter instead — that keeps the
            conversation going.
          </DialogDescription>
        </DialogHeader>
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
          Why? (optional)
          <Textarea
            rows={3}
            placeholder={`Tell ${counterpartName} what didn't work…`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        <DialogFooter>
          <Button
            variant="outline"
            className="text-destructive"
            onClick={() => {
              onConfirm(reason.trim() || null)
              handleOpenChange(false)
            }}
          >
            Decline offer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Turns a card reference on a message into the live widget it points at.
 * Cards store ids, never snapshots, so what renders here is always the
 * current state of the deal or contract — an offer accepted ten minutes
 * ago shows as accepted in the thread where it was made.
 */
function ChatCard({
  card,
  viewer,
  viewerName,
}: {
  card: ConversationCard
  viewer: ChatParty
  viewerName: string
}) {
  if (card.kind === "proposal") {
    return (
      <ProposalCard dealId={card.dealId} roundId={card.roundId} viewer={viewer} viewerName={viewerName} />
    )
  }
  return <ContractChatCard card={card} viewer={viewer} viewerName={viewerName} />
}

export { ChatCard }
