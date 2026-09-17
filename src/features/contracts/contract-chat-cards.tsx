"use client"

import * as React from "react"
import Link from "next/link"
import {
  CalendarDaysIcon,
  CheckIcon,
  ClipboardListIcon,
  ContainerIcon,
  FileSignatureIcon,
  FileTextIcon,
  PenLineIcon,
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
import {
  approveDraft,
  chooseShipmentDate,
  CONTRACT_STAGE_LABELS,
  contractProgress,
  raiseAmendment,
  requestProgress,
  signContract,
  useContracts,
  type Contract,
} from "@/features/contracts/contract-store"
import { TermSheetDialog } from "@/features/contracts/term-sheet-dialog"
import { CardProgress, CardShell } from "@/features/marketplace/chat-card-shell"
import type { ChatParty, ConversationCard } from "@/features/marketplace/conversation-store"

/** Where a given participant reads contracts in full. Same record, three
 *  front doors — each role has its own dashboard. */
function contractsHref(viewer: ChatParty, contractId: string) {
  const base =
    viewer === "kam"
      ? "/admin/contracts"
      : viewer === "buyer"
        ? "/buyer/dashboard/contracts"
        : "/seller/dashboard/contracts"
  return `${base}?contract=${contractId}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })
}

/** The card kinds that hang off a contract. Split out from the deal
 *  proposal card so neither file has to know about the other's store. */
function ContractChatCard({
  card,
  viewer,
  viewerName,
}: {
  card: ConversationCard
  viewer: ChatParty
  viewerName: string
}) {
  const contracts = useContracts()

  if (card.kind === "proposal") return null

  const contract = contracts.find((entry) => entry.id === card.contractId)
  if (!contract) return null

  if (card.kind === "contract") return <ContractOpenedCard contract={contract} viewer={viewer} />
  if (card.kind === "request") {
    return (
      <RequestCard contract={contract} requestId={card.requestId} viewer={viewer} viewerName={viewerName} />
    )
  }
  if (card.kind === "final-draft") {
    return <FinalDraftCard contract={contract} viewer={viewer} viewerName={viewerName} />
  }
  return <ShipmentDatesCard contract={contract} viewer={viewer} viewerName={viewerName} />
}

/** "Your deal now has paperwork, and here's who's driving it." */
function ContractOpenedCard({ contract, viewer }: { contract: Contract; viewer: ChatParty }) {
  const progress = contractProgress(contract)
  return (
    <CardShell
      icon={FileSignatureIcon}
      tone="brand"
      title={`Contract ${contract.reference}`}
      subtitle={`${contract.listingTitle} · managed by ${contract.kamName}`}
      footer={
        <Link
          href={contractsHref(viewer, contract.id)}
          className="inline-flex h-9 items-center justify-center rounded-full bg-amama-deep px-4 text-[13px] font-semibold text-white transition-colors hover:bg-amama-deep-hover"
        >
          Open contract
        </Link>
      }
    >
      <div className="flex flex-col gap-2 rounded-2xl bg-card/70 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Current step
          </span>
          <span className="text-[13px] font-bold text-foreground">
            {CONTRACT_STAGE_LABELS[contract.stage]}
          </span>
        </div>
        <CardProgress done={progress.cleared} total={progress.total} label="steps" tone="neutral" />
      </div>
    </CardShell>
  )
}

/**
 * The KAM asking one side for details and documents. Only ever rendered
 * for that side (and the KAM) — the message carrying it is scoped in the
 * conversation store, so the counterparty never receives it at all.
 */
function RequestCard({
  contract,
  requestId,
  viewer,
  viewerName,
}: {
  contract: Contract
  requestId: string
  viewer: ChatParty
  viewerName: string
}) {
  const [open, setOpen] = React.useState(false)
  const request = contract.requests.find((entry) => entry.id === requestId)
  if (!request) return null

  const progress = requestProgress(request)
  const submitted = request.status === "submitted"
  const isRecipient = viewer === request.party

  return (
    <>
      <CardShell
        icon={ClipboardListIcon}
        tone={submitted ? "success" : "warning"}
        title={request.title}
        subtitle={
          isRecipient
            ? submitted
              ? "Sent to your account manager"
              : "Your account manager needs these details"
            : `Asked of ${request.party === "buyer" ? contract.buyerName : contract.sellerName}`
        }
        footer={
          <Button
            size="sm"
            variant={submitted ? "outline" : "default"}
            onClick={() => setOpen(true)}
            className="w-full"
          >
            {submitted ? "View what was sent" : isRecipient ? "Fill this in" : "View progress"}
          </Button>
        }
      >
        <div className="flex flex-col gap-2 rounded-2xl bg-card/70 p-3">
          <CardProgress done={progress.done} total={progress.total} label="done" />
          <p className="text-[12px] text-muted-foreground">
            {request.fields.length} {request.fields.length === 1 ? "question" : "questions"} ·{" "}
            {request.documents.length} {request.documents.length === 1 ? "document" : "documents"}
            {submitted ? "" : " · saves as you go"}
          </p>
        </div>
      </CardShell>

      <TermSheetDialog
        open={open}
        onOpenChange={setOpen}
        contractId={contract.id}
        request={request}
        partyName={viewerName}
        readOnly={!isRecipient}
      />
    </>
  )
}

/**
 * The draft both sides have to say yes to. Shows each side's position
 * openly — a buyer waiting on a seller can see that's what they're waiting
 * on, which is most of what people want from a status.
 */
function FinalDraftCard({
  contract,
  viewer,
  viewerName,
}: {
  contract: Contract
  viewer: ChatParty
  viewerName: string
}) {
  const [reading, setReading] = React.useState(false)
  const [amending, setAmending] = React.useState(false)

  const isTrader = viewer === "buyer" || viewer === "seller"
  const signing = contract.stage === "signatures" || contract.stage === "final"
  const state = signing ? contract.signatures : contract.approvals
  const mine = isTrader ? state[viewer] : null
  const bothDone = state.buyer.agreed && state.seller.agreed

  return (
    <>
      <CardShell
        icon={signing ? PenLineIcon : FileTextIcon}
        tone={bothDone ? "success" : "brand"}
        title={signing ? `Sign contract ${contract.reference}` : `Contract draft v${contract.draftVersion}`}
        subtitle={
          bothDone
            ? signing
              ? "Signed by both sides"
              : "Agreed by both sides"
            : "Needs a yes from both sides"
        }
        footer={
          <div className="flex flex-col gap-2">
            <Button size="sm" variant="outline" className="w-full" onClick={() => setReading(true)}>
              Read the draft
            </Button>
            {isTrader && !mine?.agreed ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() =>
                    signing
                      ? signContract(contract.id, viewer, viewerName)
                      : approveDraft(contract.id, viewer, viewerName)
                  }
                >
                  <CheckIcon className="size-4" />
                  {signing ? "Sign" : "I agree"}
                </Button>
                {signing ? null : (
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setAmending(true)}>
                    Request a change
                  </Button>
                )}
              </div>
            ) : null}
          </div>
        }
      >
        <div className="flex flex-col gap-1.5 rounded-2xl bg-card/70 p-3">
          <ApprovalRow name={contract.buyerName} label="Buyer" approval={state.buyer} />
          <ApprovalRow name={contract.sellerName} label="Seller" approval={state.seller} />
        </div>
      </CardShell>

      <Dialog open={reading} onOpenChange={setReading}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Contract {contract.reference} · draft v{contract.draftVersion}
            </DialogTitle>
            <DialogDescription>{contract.listingTitle}</DialogDescription>
          </DialogHeader>
          <pre className="whitespace-pre-wrap rounded-2xl bg-muted p-4 font-sans text-[13px] leading-relaxed text-foreground">
            {contract.draftBody ?? "The draft hasn't been written yet."}
          </pre>
        </DialogContent>
      </Dialog>

      <AmendmentDialog
        open={amending}
        onOpenChange={setAmending}
        onSubmit={(text) => raiseAmendment(contract.id, viewer, viewerName, text)}
      />
    </>
  )
}

function ApprovalRow({
  name,
  label,
  approval,
}: {
  name: string
  label: string
  approval: { agreed: boolean; at: string | null }
}) {
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full",
          approval.agreed ? "bg-amama-deep text-white" : "bg-border text-muted-foreground"
        )}
      >
        {approval.agreed ? <CheckIcon className="size-3" /> : <span className="size-1.5 rounded-full bg-current" />}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium text-foreground">
        {name} <span className="font-normal text-muted-foreground">· {label}</span>
      </span>
      <span className="shrink-0 text-muted-foreground">
        {approval.agreed && approval.at ? formatDate(approval.at) : "Waiting"}
      </span>
    </div>
  )
}

function AmendmentDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (text: string) => void
}) {
  const [text, setText] = React.useState("")

  // Cleared on the way out rather than on the way in, so the next open
  // always starts blank without needing an effect to notice it opened.
  const handleOpenChange = (next: boolean) => {
    if (!next) setText("")
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request a change</DialogTitle>
          <DialogDescription>
            Tell your account manager what needs to be different. They&apos;ll revise the draft and send it
            back to both sides.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          rows={4}
          autoFocus
          placeholder="e.g. Payment terms should be 30 days, not 15."
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <DialogFooter>
          <Button
            disabled={!text.trim()}
            onClick={() => {
              onSubmit(text.trim())
              handleOpenChange(false)
            }}
          >
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Pick-a-date. The KAM's company only holds so many containers, so these
 * are the dates that can actually be honoured rather than an open
 * calendar — which is why it's a short list of cards and not a date input.
 */
function ShipmentDatesCard({
  contract,
  viewer,
  viewerName,
}: {
  contract: Contract
  viewer: ChatParty
  viewerName: string
}) {
  const poll = contract.shipmentDates
  if (!poll) return null

  const chosen = poll.options.find((option) => option.id === poll.chosenOptionId) ?? null
  // The buyer is taking delivery, so the sail date is theirs to choose.
  const canChoose = viewer === "buyer" && !chosen

  return (
    <CardShell
      icon={CalendarDaysIcon}
      tone={chosen ? "success" : "warning"}
      title={chosen ? "Shipping date confirmed" : "Choose a shipping date"}
      subtitle={
        chosen
          ? `${formatDate(chosen.date)}${chosen.containerRef ? ` · ${chosen.containerRef}` : ""}`
          : `${contract.kamName} can ship on any of these`
      }
    >
      <ul className="flex flex-col gap-2">
        {poll.options.map((option) => {
          const isChosen = option.id === poll.chosenOptionId
          const dimmed = !!chosen && !isChosen
          return (
            <li key={option.id}>
              <button
                type="button"
                disabled={!canChoose}
                onClick={() => chooseShipmentDate(contract.id, option.id, viewerName)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border p-3 text-start transition-colors",
                  isChosen ? "border-amama-deep bg-amama-subtle" : "border-border bg-card",
                  canChoose && "hover:border-amama-deep hover:bg-amama-subtle",
                  dimmed && "opacity-45",
                  !canChoose && "cursor-default"
                )}
              >
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full",
                    isChosen ? "bg-amama-deep text-white" : "bg-muted text-muted-foreground"
                  )}
                >
                  {isChosen ? <CheckIcon className="size-4" /> : <ContainerIcon className="size-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-bold text-foreground">{formatDate(option.date)}</span>
                  <span className="block truncate text-[12px] text-muted-foreground">
                    {option.containerRef ?? "Container to be assigned"}
                    {option.note ? ` · ${option.note}` : ""}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {chosen ? (
        <p className="mt-2.5 text-[12px] text-muted-foreground">
          Picked by {poll.chosenBy}. {contract.kamName} has been notified and will start the shipment.
        </p>
      ) : viewer === "buyer" ? null : (
        <p className="mt-2.5 text-[12px] text-muted-foreground">
          Waiting for {contract.buyerName} to choose.
        </p>
      )}
    </CardShell>
  )
}

export { ContractChatCard, contractsHref }
