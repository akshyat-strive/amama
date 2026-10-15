"use client"

import * as React from "react"
import { CheckIcon, ClipboardListIcon, FileTextIcon, PaperclipIcon, PlusIcon, RotateCcwIcon, Undo2Icon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { RequestNote, ReviewGroup, StatusPill } from "@/features/admin/review-ui"
import {
  addRequestItem,
  approveAllItems,
  approveItem,
  contractRequirements,
  itemState,
  requestItemChange,
  requestReview,
  unapproveItem,
  type Contract,
  type ItemKind,
  type ItemState,
  type RequestedDocument,
  type TermSheetField,
  type TermSheetRequest,
} from "@/features/contracts/contract-store"
import { AmberDot, AmberNote, WarnPill } from "@/features/contracts/contract-ui"
import { ItemStatusChip, TermSheetDialog } from "@/features/contracts/term-sheet-dialog"
import type { ChatParty } from "@/features/marketplace/conversation-store"

type Item = TermSheetField | RequestedDocument

const kindOf = (item: Item): ItemKind => ("value" in item ? "field" : "document")

/** Things only the owner can move forward — shown first, in the warning tone. */
const needsOwnerAction = (state: ItemState) => state === "empty" || state === "draft" || state === "changes-requested"

const partyLabel = (party: "buyer" | "seller") => (party === "buyer" ? "Buyer" : "Seller")

function Progress({ approved, total }: { approved: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((approved / total) * 100)
  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px] whitespace-nowrap text-muted-foreground tabular-nums">
        {approved} of {total} approved
      </span>
      <div className="h-1 min-w-12 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={approved} aria-valuemin={0} aria-valuemax={total}>
        <div className="h-full rounded-full bg-amama-deep transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function IconAction({ label, onClick, children, tone = "neutral" }: { label: string; onClick: () => void; children: React.ReactNode; tone?: "neutral" | "success" }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={onClick}
            aria-label={label}
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-[10px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40 [&_svg]:size-4",
              tone === "success" ? "bg-amama-subtle text-amama-deep hover:bg-amama-subtle/70" : "bg-card text-foreground/70 hover:bg-muted hover:text-foreground"
            )}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  )
}

function Answer({ item }: { item: Item }) {
  if ("value" in item) {
    if (!item.value?.trim()) return null
    return <p className="mt-2 rounded-xl bg-card px-3 py-2 text-[13px] break-words whitespace-pre-wrap text-foreground">{item.value}</p>
  }
  if (item.files.length === 0) return null
  return (
    <div className="mt-2 flex flex-wrap gap-1.5 rounded-xl bg-card px-3 py-2">
      {item.files.map((file) => (
        <span key={file.id} className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-background px-2 py-1 text-[12px] font-medium text-foreground">
          <PaperclipIcon aria-hidden className="size-3 shrink-0 text-muted-foreground" />
          <span className="truncate">{file.name}</span>
        </span>
      ))}
    </div>
  )
}

type Perspective = "owner" | "other" | "kam"

function ItemRow({
  contract,
  request,
  item,
  perspective,
  viewerName,
}: {
  contract: Contract
  request: TermSheetRequest
  item: Item
  perspective: Perspective
  viewerName: string
}) {
  const [asking, setAsking] = React.useState(false)
  const state = itemState(request, item)
  const kind = kindOf(item)
  const isDoc = kind === "document"
  const showAnswer = perspective !== "other"
  const note = item.review?.status === "changes-requested" ? item.review.note : null
  const canApprove = perspective === "kam" && (state === "submitted" || state === "draft")

  return (
    <div>
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
              {perspective === "owner" && needsOwnerAction(state) ? <AmberDot /> : null}
              {item.label}
            </p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {item.required ? "Required" : "Optional"} · {isDoc ? "Document" : "Detail"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <ItemStatusChip state={state} perspective={perspective} />
            {perspective === "kam" ? (
              <>
                {canApprove ? (
                  <IconAction label="Approve" tone="success" onClick={() => approveItem(contract.id, request.id, kind, item.id, viewerName)}>
                    <CheckIcon strokeWidth={2.5} />
                  </IconAction>
                ) : null}
                {state === "approved" ? (
                  <IconAction label="Unapprove" onClick={() => unapproveItem(contract.id, request.id, kind, item.id, viewerName)}>
                    <Undo2Icon />
                  </IconAction>
                ) : null}
                {state !== "empty" && state !== "changes-requested" ? (
                  <IconAction label="Ask for update" onClick={() => setAsking((value) => !value)}>
                    <RotateCcwIcon />
                  </IconAction>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
        {showAnswer ? <Answer item={item} /> : null}
        {showAnswer && note ? (
          <AmberNote className="mt-2">
            <span className="font-semibold">{item.review?.by ?? "Account manager"} asked for an update: </span>
            {note}
          </AmberNote>
        ) : null}
      </div>
      {asking ? (
        <RequestNote
          id={`ask-${item.id}`}
          prompt={`What should ${request.party === "buyer" ? contract.buyerName : contract.sellerName} change?`}
          placeholder="The certificate has expired, please upload the current one."
          submitLabel="Ask for update"
          onCancel={() => setAsking(false)}
          onSubmit={(text) => {
            requestItemChange(contract.id, request.id, kind, item.id, viewerName, text)
            setAsking(false)
          }}
        />
      ) : null}
    </div>
  )
}

function AddItemForm({ initialKind, onCancel, onSubmit }: { initialKind: ItemKind; onCancel: () => void; onSubmit: (input: { kind: ItemKind; label: string; required: boolean; help: string | null }) => void }) {
  const [kind, setKind] = React.useState<ItemKind>(initialKind)
  const [label, setLabel] = React.useState("")
  const [help, setHelp] = React.useState("")
  const [required, setRequired] = React.useState(true)
  const ready = label.trim().length > 0

  return (
    <div className="flex flex-col gap-2.5 bg-muted/50 px-4 py-3">
      <div className="flex gap-1.5">
        {(["document", "field"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setKind(option)}
            aria-pressed={kind === option}
            className={cn(
              "h-8 rounded-[10px] px-3 text-[12.5px] font-semibold transition-colors",
              kind === option ? "bg-graphite text-white" : "bg-card text-foreground hover:bg-background"
            )}
          >
            {option === "document" ? "Document" : "Detail"}
          </button>
        ))}
      </div>
      <Input
        value={label}
        onChange={(event) => setLabel(event.target.value)}
        placeholder={kind === "document" ? "Phytosanitary certificate" : "Warehouse contact number"}
        aria-label="What to ask for"
        autoFocus
      />
      <Input value={help} onChange={(event) => setHelp(event.target.value)} placeholder="Help text (optional)" aria-label="Help text" />
      <div className="flex items-center justify-between gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-[12.5px] font-medium text-foreground">
          <input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} className="size-4 accent-[var(--amama-deep)]" />
          Required
        </label>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" disabled={!ready} onClick={() => onSubmit({ kind, label, required, help: help.trim() || null })}>
            <PlusIcon />
            Ask
          </Button>
        </div>
      </div>
    </div>
  )
}

function RequestBlock({
  contract,
  request,
  perspective,
  viewerName,
}: {
  contract: Contract
  request: TermSheetRequest
  perspective: Perspective
  viewerName: string
}) {
  const [open, setOpen] = React.useState(false)
  const [adding, setAdding] = React.useState<ItemKind | null>(null)
  const review = requestReview(request)
  const submitted = request.status === "submitted"
  const items: Item[] = [...request.fields, ...request.documents]
  const ordered =
    perspective === "owner"
      ? [...items].sort((a, b) => Number(needsOwnerAction(itemState(request, b))) - Number(needsOwnerAction(itemState(request, a))))
      : items
  const hasAnswers = items.some((item) => itemState(request, item) !== "empty")
  const approvable = items.some((item) => {
    const state = itemState(request, item)
    return state === "submitted" || state === "draft"
  })

  return (
    <div className="divide-inset">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
        <div className="min-w-[10rem] flex-1">
          <p className="text-[13.5px] font-semibold text-foreground">{request.title}</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground tabular-nums">
            {review.approved} of {review.total} approved
          </p>
        </div>
        {submitted ? <StatusPill tone="success">Submitted</StatusPill> : <WarnPill>Open</WarnPill>}
        {perspective === "owner" ? (
          <Button size="sm" variant={submitted ? "outline" : "default"} onClick={() => setOpen(true)}>
            {submitted ? "View" : hasAnswers ? "Edit" : "Fill in"}
          </Button>
        ) : null}
        {perspective === "kam" ? (
          <div className="flex w-full flex-wrap items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={() => setAdding(adding === "document" ? null : "document")}>
              <PlusIcon />
              Document
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAdding(adding === "field" ? null : "field")}>
              <PlusIcon />
              Detail
            </Button>
            <Button size="sm" disabled={!approvable} onClick={() => approveAllItems(contract.id, viewerName, request.id)}>
              <CheckIcon />
              Approve all
            </Button>
          </div>
        ) : null}
      </div>

      {adding ? (
        <AddItemForm
          key={adding}
          initialKind={adding}
          onCancel={() => setAdding(null)}
          onSubmit={(input) => {
            addRequestItem(contract.id, request.id, viewerName, input)
            setAdding(null)
          }}
        />
      ) : null}

      {ordered.map((item) => (
        <ItemRow key={item.id} contract={contract} request={request} item={item} perspective={perspective} viewerName={viewerName} />
      ))}
      {ordered.length === 0 ? <p className="px-4 py-3 text-[13px] text-muted-foreground">Nothing asked for yet.</p> : null}

      {perspective === "owner" ? (
        <TermSheetDialog open={open} onOpenChange={setOpen} contractId={contract.id} request={request} partyName={viewerName} />
      ) : null}
    </div>
  )
}

function PartyGroup({
  contract,
  title,
  caption,
  requests,
  perspective,
  viewerName,
  emptyText,
}: {
  contract: Contract
  title: string
  caption?: string
  requests: TermSheetRequest[]
  perspective: Perspective
  viewerName: string
  emptyText: string
}) {
  const totals = requests.reduce(
    (sum, request) => {
      const review = requestReview(request)
      return { total: sum.total + review.total, approved: sum.approved + review.approved }
    },
    { total: 0, approved: 0 }
  )

  return (
    <ReviewGroup
      header={
        <div className="flex flex-col gap-2">
          <h4 className="flex flex-wrap items-baseline gap-x-2 text-[14px] font-semibold text-foreground">
            {title}
            {caption ? <span className="text-[12px] font-normal text-muted-foreground">{caption}</span> : null}
          </h4>
          {totals.total > 0 ? <Progress approved={totals.approved} total={totals.total} /> : null}
        </div>
      }
    >
      {requests.length === 0 ? (
        <p className="px-4 py-3 text-[13px] text-muted-foreground">{emptyText}</p>
      ) : (
        requests.map((request) => (
          <RequestBlock key={request.id} contract={contract} request={request} perspective={perspective} viewerName={viewerName} />
        ))
      )}
    </ReviewGroup>
  )
}

/**
 * What each side has been asked for. A trader sees their own answers in
 * full, and only the labels and status of what the other side owes — never
 * the values or file names. The KAM sees both sides in full and does the
 * reviewing here.
 */
function ContractRequirements({ contract, viewer, viewerName }: { contract: Contract; viewer: ChatParty; viewerName: string }) {
  const isTrader = viewer === "buyer" || viewer === "seller"

  if (contract.requests.length === 0) {
    return (
      <ReviewGroup
        header={
          <h3 className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
            <ClipboardListIcon className="size-4 text-muted-foreground" />
            Requirements
          </h3>
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
          <p className="text-[13px] text-muted-foreground">
            {isTrader ? "Your account manager will ask for anything they need here." : "Nothing has been requested from either side yet."}
          </p>
          {isTrader ? null : (
            <Button
              size="sm"
              onClick={() => document.getElementById("request-builder")?.scrollIntoView({ behavior: "smooth", block: "center" })}
            >
              <FileTextIcon />
              Ask for details
            </Button>
          )}
        </div>
      </ReviewGroup>
    )
  }

  const mineParty = isTrader ? viewer : null
  const partyRequests = (party: "buyer" | "seller") => contract.requests.filter((request) => request.party === party)
  const nameOf = (party: "buyer" | "seller") => (party === "buyer" ? contract.buyerName : contract.sellerName)
  const overall = contractRequirements(contract)
  const anyApprovable = contract.requests.some((request) =>
    [...request.fields, ...request.documents].some((item) => {
      const state = itemState(request, item)
      return state === "submitted" || state === "draft"
    })
  )

  return (
    <TooltipProvider delay={300}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1">
          <h3 className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
            <ClipboardListIcon className="size-4 text-muted-foreground" />
            Requirements
          </h3>
          {viewer === "kam" ? (
            <>
              <span className="text-[12px] text-muted-foreground tabular-nums">
                {overall.approved} of {overall.total} approved
              </span>
              {contract.requests.length > 1 ? (
                <Button size="sm" className="ms-auto" disabled={!anyApprovable} onClick={() => approveAllItems(contract.id, viewerName)}>
                  <CheckIcon />
                  Approve everything
                </Button>
              ) : null}
            </>
          ) : null}
        </div>

        {mineParty ? (
          <>
            <PartyGroup
              contract={contract}
              title="From you"
              requests={partyRequests(mineParty)}
              perspective="owner"
              viewerName={viewerName}
              emptyText="Nothing asked of you."
            />
            <PartyGroup
              contract={contract}
              title={`From ${nameOf(mineParty === "buyer" ? "seller" : "buyer")}`}
              caption="You can see what's asked and where it stands, not the answers"
              requests={partyRequests(mineParty === "buyer" ? "seller" : "buyer")}
              perspective="other"
              viewerName={viewerName}
              emptyText="Nothing asked of them yet."
            />
          </>
        ) : (
          <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-2">
            {(["buyer", "seller"] as const).map((party) => (
              <PartyGroup
                key={party}
                contract={contract}
                title={nameOf(party)}
                caption={partyLabel(party)}
                requests={partyRequests(party)}
                perspective="kam"
                viewerName={viewerName}
                emptyText={`Nothing asked of the ${party} yet.`}
              />
            ))}
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

export { ContractRequirements }
