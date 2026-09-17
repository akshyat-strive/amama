"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import {
  CalendarDaysIcon,
  CheckIcon,
  ClipboardListIcon,
  FileSignatureIcon,
  HandshakeIcon,
  MessageSquareIcon,
  PenLineIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ContractAuthoring } from "@/features/contracts/contract-authoring"
import {
  approveDraft,
  CONTRACT_STAGE_LABELS,
  CONTRACT_STAGE_ORDER,
  contractsForParty,
  requestProgress,
  requestsForParty,
  signContract,
  useContracts,
  type Contract,
  type TermSheetRequest,
} from "@/features/contracts/contract-store"
import { TermSheetDialog } from "@/features/contracts/term-sheet-dialog"
import type { ChatParty } from "@/features/marketplace/conversation-store"
import { useDeals, type NegotiationRound } from "@/features/marketplace/deal-store"

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })
}

/**
 * Every contract this account can see, and one of them opened in full.
 *
 * One component for all three audiences rather than a KAM copy and a
 * trader copy: the record is identical, only what you may *do* to it
 * differs, and keeping that difference as a handful of `viewer` checks is
 * what stops the two copies drifting into showing different truths about
 * the same contract.
 */
function ContractsView({ viewer, identity }: { viewer: ChatParty; identity: { id: string; name: string } }) {
  // `useSearchParams` opts a route out of static rendering unless it sits
  // under a boundary, and all three roles reach this same component — so
  // the boundary lives here once rather than in each of their pages.
  return (
    <React.Suspense fallback={<ContractsSkeleton />}>
      <ContractsWorkspace viewer={viewer} identity={identity} />
    </React.Suspense>
  )
}

function ContractsSkeleton() {
  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">Contracts</h1>
      <div className="mt-6 h-40 animate-pulse rounded-3xl bg-muted" />
    </div>
  )
}

function ContractsWorkspace({
  viewer,
  identity,
}: {
  viewer: ChatParty
  identity: { id: string; name: string }
}) {
  const contracts = useContracts()
  const searchParams = useSearchParams()
  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  const visible = React.useMemo(
    () => (viewer === "kam" ? contracts : contractsForParty(contracts, identity.id)),
    [contracts, identity.id, viewer]
  )

  const requestedId = searchParams.get("contract")
  const effectiveId =
    selectedId ?? (requestedId && visible.some((entry) => entry.id === requestedId) ? requestedId : visible[0]?.id)
  const selected = visible.find((entry) => entry.id === effectiveId) ?? null

  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">Contracts</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">
        {viewer === "kam"
          ? "Every agreed deal being turned into paperwork."
          : "The agreements your account manager is putting together for your deals."}
      </p>

      {visible.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border px-5 py-16 text-center">
          <FileSignatureIcon className="size-6 text-muted-foreground" />
          <p className="text-[15px] font-semibold">No contracts yet</p>
          <p className="max-w-sm text-[13px] text-muted-foreground">
            {viewer === "kam"
              ? "Open a contract from an agreed deal on the Deals page and it'll appear here."
              : "Once you and your counterparty agree a deal, your account manager opens a contract and it shows up here."}
          </p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4 lg:flex-row">
          <ul className="flex shrink-0 flex-col gap-2 lg:w-[280px]">
            {visible.map((contract) => (
              <li key={contract.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(contract.id)}
                  aria-current={contract.id === selected?.id ? "true" : undefined}
                  className={cn(
                    "w-full rounded-[18px] border p-3.5 text-start transition-colors",
                    contract.id === selected?.id
                      ? "border-amama-deep bg-amama-subtle"
                      : "border-border bg-card hover:bg-muted"
                  )}
                >
                  <p className="text-[13px] font-bold text-foreground">{contract.reference}</p>
                  <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{contract.listingTitle}</p>
                  <p className="mt-1.5 inline-flex rounded-full bg-card px-2 py-0.5 text-[11px] font-semibold text-amama-deep">
                    {CONTRACT_STAGE_LABELS[contract.stage]}
                  </p>
                </button>
              </li>
            ))}
          </ul>

          <div className="min-w-0 flex-1">
            {selected ? (
              <ContractDetail contract={selected} viewer={viewer} identity={identity} />
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

function ContractDetail({
  contract,
  viewer,
  identity,
}: {
  contract: Contract
  viewer: ChatParty
  identity: { id: string; name: string }
}) {
  const deals = useDeals()
  const deal = deals.find((entry) => entry.id === contract.dealId) ?? null
  const isTrader = viewer === "buyer" || viewer === "seller"
  const myRequests = isTrader ? requestsForParty(contract, viewer) : contract.requests

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[17px] font-bold tracking-tight">{contract.reference}</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{contract.listingTitle}</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {contract.buyerName} ↔ {contract.sellerName} · managed by{" "}
              <span className="font-medium text-foreground">{contract.kamName}</span>
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-amama-subtle px-3 py-1 text-[12px] font-semibold text-amama-deep">
            {CONTRACT_STAGE_LABELS[contract.stage]}
          </span>
        </div>

        <div className="mt-4">
          <StageRail stage={contract.stage} />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Term label="Price" value={`${formatUsd(contract.terms.pricePerTonneUsd)}/t`} />
          <Term label="Quantity" value={`${contract.terms.quantityMt} MT`} />
          <Term
            label="Total value"
            value={formatUsd(contract.terms.pricePerTonneUsd * contract.terms.quantityMt)}
          />
          <Term label="Incoterm" value={contract.terms.incoterm ?? "—"} />
          <Term label="Payment" value={contract.terms.paymentTerm ?? "—"} />
          <Term label="Origin" value={contract.terms.originPort ?? "—"} />
          <Term label="Destination" value={contract.terms.destinationPort ?? "—"} />
          <Term label="Quality" value={contract.terms.qualitySpec ?? "—"} />
        </dl>
      </section>

      {/* How the two sides got to this price — the negotiation itself, not
          a summary of it. A KAM writing the contract needs to see what was
          actually offered, countered and accepted. */}
      {deal ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold">
            <HandshakeIcon className="size-4 text-muted-foreground" />
            How this deal was agreed
          </h3>
          <ol className="mt-3 flex flex-col gap-2">
            {deal.rounds.map((round) => (
              <RoundRow key={round.id} round={round} />
            ))}
          </ol>
        </section>
      ) : null}

      {myRequests.length > 0 ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold">
            <ClipboardListIcon className="size-4 text-muted-foreground" />
            {isTrader ? "What you've been asked for" : "Details requested from both sides"}
          </h3>
          <ul className="mt-3 flex flex-col gap-2">
            {myRequests.map((request) => (
              <RequestRow
                key={request.id}
                contract={contract}
                request={request}
                viewer={viewer}
                viewerName={identity.name}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {contract.draftBody ? (
        <DraftSection contract={contract} viewer={viewer} viewerName={identity.name} />
      ) : null}

      {contract.amendments.length > 0 ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-[15px] font-semibold">Changes requested</h3>
          <ul className="mt-3 flex flex-col gap-2">
            {contract.amendments.map((amendment) => (
              <li
                key={amendment.id}
                className={cn(
                  "rounded-[14px] px-3 py-2.5 text-[13px]",
                  amendment.resolved ? "bg-muted text-muted-foreground" : "bg-status-warning/10 text-foreground"
                )}
              >
                <span className="font-semibold">{amendment.raisedByName}</span> · {formatDate(amendment.at)}
                {amendment.resolved ? " · resolved" : ""}
                <p className="mt-0.5">{amendment.text}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {contract.shipmentDates ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold">
            <CalendarDaysIcon className="size-4 text-muted-foreground" />
            Shipping date
          </h3>
          {contract.shipmentDates.chosenOptionId ? (
            <p className="mt-2 text-[13px] text-foreground">
              {formatDate(
                contract.shipmentDates.options.find(
                  (option) => option.id === contract.shipmentDates?.chosenOptionId
                )?.date ?? ""
              )}{" "}
              <span className="text-muted-foreground">— chosen by {contract.shipmentDates.chosenBy}</span>
            </p>
          ) : (
            <p className="mt-2 text-[13px] text-muted-foreground">
              {contract.shipmentDates.options.length} dates offered — waiting for {contract.buyerName} to pick
              one in the conversation.
            </p>
          )}
        </section>
      ) : null}

      {viewer === "kam" ? <ContractAuthoring contract={contract} kamName={identity.name} /> : null}
    </div>
  )
}

/** The seven steps, as a rail. Reads as "where are we" at a glance, which
 *  is the single most common question anyone opens a contract to answer. */
function StageRail({ stage }: { stage: Contract["stage"] }) {
  const currentIndex = CONTRACT_STAGE_ORDER.indexOf(stage)
  return (
    <ol className="flex flex-wrap gap-1.5">
      {CONTRACT_STAGE_ORDER.map((entry, index) => {
        const done = index < currentIndex
        const current = index === currentIndex
        return (
          <li
            key={entry}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
              current
                ? "bg-amama-deep text-white"
                : done
                  ? "bg-amama-subtle text-amama-deep"
                  : "bg-muted text-muted-foreground"
            )}
          >
            {done ? <CheckIcon className="size-3" /> : null}
            {CONTRACT_STAGE_LABELS[entry]}
          </li>
        )
      })}
    </ol>
  )
}

function Term({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="truncate text-[14px] font-bold text-foreground">{value}</dd>
    </div>
  )
}

const roundOutcomeStyles = {
  pending: "bg-status-warning/10 text-status-warning",
  accepted: "bg-amama-subtle text-amama-deep",
  declined: "bg-destructive/10 text-destructive",
  countered: "bg-muted text-muted-foreground",
} as const

function RoundRow({ round }: { round: NegotiationRound }) {
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-[14px] bg-muted px-3 py-2.5 text-[13px]">
      <span className="font-semibold text-foreground">{round.byName}</span>
      <span className="tabular-nums text-foreground">
        {formatUsd(round.pricePerTonneUsd)}/t × {round.quantityMt} MT
      </span>
      {round.incoterm ? <span className="text-muted-foreground">{round.incoterm}</span> : null}
      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", roundOutcomeStyles[round.outcome])}>
        {round.outcome === "pending" ? "Awaiting reply" : round.outcome}
        {round.outcomeBy ? ` · ${round.outcomeBy}` : ""}
      </span>
      <span className="ms-auto text-[12px] text-muted-foreground">{formatDate(round.at)}</span>
      {round.comments.length > 0 ? (
        <span className="flex w-full items-center gap-1.5 text-[12px] text-muted-foreground">
          <MessageSquareIcon className="size-3" />
          {round.comments.map((comment) => `${comment.byName}: ${comment.text}`).join(" · ")}
        </span>
      ) : null}
    </li>
  )
}

function RequestRow({
  contract,
  request,
  viewer,
  viewerName,
}: {
  contract: Contract
  request: TermSheetRequest
  viewer: ChatParty
  viewerName: string
}) {
  const [open, setOpen] = React.useState(false)
  const progress = requestProgress(request)
  const isRecipient = viewer === request.party

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-[14px] bg-muted px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-foreground">{request.title}</p>
        <p className="text-[12px] text-muted-foreground">
          {viewer === "kam" ? `${request.party === "buyer" ? contract.buyerName : contract.sellerName} · ` : ""}
          {progress.done}/{progress.total} required items ·{" "}
          {request.status === "submitted" ? "submitted" : "in progress"}
        </p>
      </div>
      <Button size="sm" variant={request.status === "submitted" ? "outline" : "default"} onClick={() => setOpen(true)}>
        {isRecipient && request.status !== "submitted" ? "Fill this in" : "View"}
      </Button>
      <TermSheetDialog
        open={open}
        onOpenChange={setOpen}
        contractId={contract.id}
        request={request}
        partyName={viewerName}
        readOnly={!isRecipient}
      />
    </li>
  )
}

function DraftSection({
  contract,
  viewer,
  viewerName,
}: {
  contract: Contract
  viewer: ChatParty
  viewerName: string
}) {
  const isTrader = viewer === "buyer" || viewer === "seller"
  const signing = contract.stage === "signatures" || contract.stage === "final"
  const state = signing ? contract.signatures : contract.approvals
  const mine = isTrader ? state[viewer] : null

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold">
          <PenLineIcon className="size-4 text-muted-foreground" />
          Draft v{contract.draftVersion}
        </h3>
        {isTrader && !mine?.agreed ? (
          <Button
            size="sm"
            onClick={() =>
              signing
                ? signContract(contract.id, viewer, viewerName)
                : approveDraft(contract.id, viewer, viewerName)
            }
          >
            <CheckIcon className="size-4" />
            {signing ? "Sign contract" : "I agree to this draft"}
          </Button>
        ) : null}
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        <ApprovalLine name={contract.buyerName} label="Buyer" approval={state.buyer} />
        <ApprovalLine name={contract.sellerName} label="Seller" approval={state.seller} />
      </div>

      <pre className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-[14px] bg-muted p-4 font-sans text-[13px] leading-relaxed text-foreground">
        {contract.draftBody}
      </pre>
    </section>
  )
}

function ApprovalLine({
  name,
  label,
  approval,
}: {
  name: string
  label: string
  approval: { agreed: boolean; at: string | null }
}) {
  return (
    <div className="flex items-center gap-2 text-[13px]">
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full",
          approval.agreed ? "bg-amama-deep text-white" : "bg-border text-muted-foreground"
        )}
      >
        {approval.agreed ? <CheckIcon className="size-3" /> : <span className="size-1.5 rounded-full bg-current" />}
      </span>
      <span className="min-w-0 flex-1 truncate text-foreground">
        {name} <span className="text-muted-foreground">· {label}</span>
      </span>
      <span className="shrink-0 text-[12px] text-muted-foreground">
        {approval.agreed && approval.at ? formatDate(approval.at) : "Waiting"}
      </span>
    </div>
  )
}

export { ContractsView }
