"use client"

import * as React from "react"

import {
  logSystemMessageForConversation,
  postCard,
  type ChatParty,
} from "@/features/marketplace/conversation-store"
import type { Deal } from "@/features/marketplace/deal-store"

const STORAGE_KEY = "amama.contracts"

/**
 * The paperwork a KAM walks an agreed deal through, in order. Each stage is
 * a real gate with a real owner, not a label: `term-sheet` waits on the two
 * parties to supply what they were asked for, `review` waits on both to
 * accept the draft, `signatures` waits on both to sign.
 */
export type ContractStage =
  | "summary"
  | "term-sheet"
  | "draft"
  | "review"
  | "amendments"
  | "signatures"
  | "final"

export const CONTRACT_STAGE_ORDER: ContractStage[] = [
  "summary",
  "term-sheet",
  "draft",
  "review",
  "amendments",
  "signatures",
  "final",
]

export const CONTRACT_STAGE_LABELS: Record<ContractStage, string> = {
  summary: "Deal summary",
  "term-sheet": "Term sheet",
  draft: "Contract draft",
  review: "Review",
  amendments: "Amendments",
  signatures: "Signatures",
  final: "Final contract",
}

export type ContractStageEntry = {
  stage: ContractStage
  at: string
  by: string
  note: string | null
}

export type TermSheetFieldType = "text" | "number" | "date" | "select" | "textarea"

export type TermSheetField = {
  id: string
  label: string
  type: TermSheetFieldType
  required: boolean
  options?: string[]
  help: string | null
  /** `null` until the party fills it in. Written on every keystroke-save,
   *  long before the request is submitted — see `saveRequestDraft`. */
  value: string | null
}

/** Metadata only, never bytes — same deal as the onboarding document cards.
 *  A real upload would go to object storage; here the name and size are
 *  what survive a reload, which is enough to show a filled checklist. */
export type UploadedFile = {
  id: string
  name: string
  size: number
  uploadedAt: string
}

export type RequestedDocument = {
  id: string
  label: string
  required: boolean
  help: string | null
  files: UploadedFile[]
}

/**
 * One party's homework. Addressed to exactly one side — the chat card that
 * carries it is posted `visibleTo` that party and the KAM only, so a buyer
 * never learns what the seller was asked to produce, which is the whole
 * point of the KAM sitting in the middle.
 */
export type TermSheetRequest = {
  id: string
  party: "buyer" | "seller"
  title: string
  note: string | null
  fields: TermSheetField[]
  documents: RequestedDocument[]
  status: "open" | "submitted"
  submittedAt: string | null
  updatedAt: string
}

export type ShipmentDateOption = {
  id: string
  /** ISO date (no time) — a shipping window start, not a timestamp. */
  date: string
  containerRef: string | null
  note: string | null
}

/**
 * The KAM's company only controls so many containers, so the sail date is a
 * short menu of what can actually be honoured rather than a free date
 * picker. The buyer picks one; that choice starts the shipment.
 */
export type ShipmentDatePoll = {
  id: string
  options: ShipmentDateOption[]
  chosenOptionId: string | null
  chosenBy: string | null
  chosenAt: string | null
  askedAt: string
}

/** One side's yes — used for both draft approval and signature, which are
 *  the same shape and both need the other side before anything moves. */
export type PartyApproval = {
  agreed: boolean
  at: string | null
  by: string | null
  note: string | null
}

/**
 * The fixed set of clauses every term sheet negotiates, straight off the
 * standard agro-export checklist (spec, packaging, price, payment,
 * Incoterms, delivery window, QC, dispute resolution). Fixed rather than
 * free-form so both sides — and the KAM reading across many contracts —
 * always find the same clause in the same place.
 */
export type ClauseKey =
  | "productSpec"
  | "packagingSpec"
  | "priceCurrency"
  | "paymentTerms"
  | "incoterms"
  | "deliveryWindow"
  | "qcArrangement"
  | "disputeResolution"

export const CLAUSE_ORDER: ClauseKey[] = [
  "productSpec",
  "packagingSpec",
  "priceCurrency",
  "paymentTerms",
  "incoterms",
  "deliveryWindow",
  "qcArrangement",
  "disputeResolution",
]

export const CLAUSE_LABELS: Record<ClauseKey, string> = {
  productSpec: "Product spec",
  packagingSpec: "Packaging spec",
  priceCurrency: "Price & currency",
  paymentTerms: "Payment terms",
  incoterms: "Incoterms",
  deliveryWindow: "Delivery window",
  qcArrangement: "QC arrangement",
  disputeResolution: "Dispute resolution",
}

/** `pending` — someone has proposed a value but the two sides don't (yet)
 *  agree on it; `agreed` — the buyer's and seller's most recent proposals
 *  match; `disputed` — pulled back for the KAM to mediate, same idea as
 *  `ContractAmendment` but scoped to one clause rather than the whole
 *  draft. */
export type ClauseStatus = "pending" | "agreed" | "disputed"

export type ClauseProposal = {
  value: string
  by: ChatParty
  byName: string
  at: string
}

/**
 * One line of the term sheet. Under trade law any change to a term by
 * either side is a fresh counter-offer that resets the other side's
 * earlier "yes" — modeled here as: agreement only holds while the buyer's
 * and seller's *latest* proposals still match, so a new counter from
 * either side immediately drops the clause back to `pending` on its own,
 * without a separate "reset" step anywhere.
 */
export type TermSheetClause = {
  id: string
  key: ClauseKey
  label: string
  /** The standing value — the latest proposal's, whoever made it. */
  value: string | null
  status: ClauseStatus
  /** Oldest → newest. */
  proposals: ClauseProposal[]
  /** The chat line this clause's value was pinned from, if it was — the
   *  bi-directional link back to where the number actually came from. */
  linkedMessageText: string | null
  updatedAt: string
}

export type ContractAmendment = {
  id: string
  raisedBy: ChatParty
  raisedByName: string
  text: string
  at: string
  resolved: boolean
  resolvedAt: string | null
}

/** `auto-accepted` — the PO matches the agreed term sheet exactly, so
 *  under trade law the PO itself is the acceptance and the contract forms
 *  the instant it's issued, no extra step needed. `pending-seller-
 *  confirmation` — the buyer changed something at the moment of issuing
 *  it, which makes the PO a fresh counter-offer that needs the seller's
 *  own yes before anything is binding. `confirmed` — the seller gave that
 *  yes. */
export type PoStatus = "auto-accepted" | "pending-seller-confirmation" | "confirmed"

export type PurchaseOrder = {
  issuedAt: string
  issuedByName: string
  /** A snapshot at issuance — the PO's own record of what it said,
   *  independent of whatever the clauses go on to do afterward. */
  terms: Partial<Record<ClauseKey, string>>
  deviatedClauses: ClauseKey[]
  status: PoStatus
  sellerConfirmedAt: string | null
  sellerConfirmedBy: string | null
  cancelledAt: string | null
  cancelledBy: string | null
}

export type Contract = {
  id: string
  reference: string
  dealId: string
  conversationId: string
  listingTitle: string

  buyerId: string
  buyerName: string
  sellerId: string
  sellerName: string
  kamId: string
  kamName: string

  stage: ContractStage
  stageHistory: ContractStageEntry[]

  terms: {
    pricePerTonneUsd: number
    quantityMt: number
    incoterm: string | null
    paymentTerm: string | null
    originPort: string | null
    destinationPort: string | null
    qualitySpec: string | null
    notes: string | null
  }

  requests: TermSheetRequest[]
  clauses: TermSheetClause[]
  /** `null` until `openTermSheet` has posted its one card — guards against
   *  posting a second copy of the same persistent card if a KAM clicks the
   *  button twice. */
  termSheetOpenedAt: string | null
  draftBody: string | null
  draftVersion: number
  amendments: ContractAmendment[]
  approvals: { buyer: PartyApproval; seller: PartyApproval }
  signatures: { buyer: PartyApproval; seller: PartyApproval }
  po: PurchaseOrder | null
  shipmentDates: ShipmentDatePoll | null

  createdAt: string
  updatedAt: string
}

/** Backfills a `Contract` stored before clauses/term-sheet-opened/PO
 *  existed — same convention as `listing-store.ts`'s `normalize` and
 *  `deal-store.ts`'s `normalizeDeal`. Without this, a browser with
 *  old-shaped contracts already in `localStorage` would crash the first
 *  time a page reads `contract.clauses`. */
function normalizeContract(raw: Partial<Contract>): Contract {
  return {
    clauses: seedClauses({}),
    termSheetOpenedAt: null,
    po: null,
    ...raw,
  } as Contract
}

let snapshot: Contract[] = []
let restored = false
const listeners = new Set<() => void>()
const emptyContracts: Contract[] = []

function restoreOnce() {
  if (restored || typeof window === "undefined") return
  restored = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) snapshot = (JSON.parse(raw) as Partial<Contract>[]).map(normalizeContract)
  } catch {
    // Private mode or blocked storage — carry on with nothing drafted.
  }
}

function subscribe(listener: () => void) {
  restoreOnce()
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  restoreOnce()
  return snapshot
}

function getServerSnapshot() {
  return emptyContracts
}

function write(next: Contract[]) {
  snapshot = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Persistence is best-effort.
  }
  listeners.forEach((listener) => listener())
}

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function useContracts(): Contract[] {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/** Seeds a fixed batch of contracts, but only if the store is genuinely
 *  empty — same belt-and-suspenders convention as every other store's
 *  `seed*IfEmpty`, see `seed-data.ts`. */
function seedContractsIfEmpty(contracts: Contract[]) {
  restoreOnce()
  if (snapshot.length > 0) return
  write(contracts)
}

function findContract(id: string): Contract | undefined {
  return snapshot.find((contract) => contract.id === id)
}

function updateContract(id: string, patch: Partial<Contract>) {
  write(
    snapshot.map((contract) =>
      contract.id === id ? { ...contract, ...patch, updatedAt: new Date().toISOString() } : contract
    )
  )
}

function contractForDeal(contracts: Contract[], dealId: string): Contract | null {
  return contracts.find((contract) => contract.dealId === dealId) ?? null
}

/** Every contract a given buyer or seller is party to. The dashboard
 *  Contracts page is exactly this list. */
function contractsForParty(contracts: Contract[], personId: string): Contract[] {
  return contracts.filter((contract) => contract.buyerId === personId || contract.sellerId === personId)
}

/** The requests a given party is allowed to see: their own, never the
 *  counterparty's. A KAM calls `contract.requests` directly instead. */
function requestsForParty(contract: Contract, party: "buyer" | "seller"): TermSheetRequest[] {
  return contract.requests.filter((request) => request.party === party)
}

const emptyApproval: PartyApproval = { agreed: false, at: null, by: null, note: null }

/** The fixed 8-clause starting set, pre-filled wherever the negotiated
 *  deal already answers it — a head start, not an agreement: every clause
 *  still starts `pending` until both sides actually propose it themselves
 *  (see `proposeClause`). */
function seedClauses(known: Partial<Record<ClauseKey, string | null>>): TermSheetClause[] {
  const now = new Date().toISOString()
  return CLAUSE_ORDER.map((key) => ({
    id: generateId("clause"),
    key,
    label: CLAUSE_LABELS[key],
    value: known[key] ?? null,
    status: "pending",
    proposals: [],
    linkedMessageText: null,
    updatedAt: now,
  }))
}

/** Whether every clause has a matching yes from both sides — the gate
 *  `issuePurchaseOrder` checks before letting a PO out the door. */
function allClausesAgreed(contract: Contract): boolean {
  return contract.clauses.every((clause) => clause.status === "agreed")
}

/**
 * Opens the contract for an agreed deal. Only ever called by a KAM who has
 * the deal assigned to them — that gating lives in the view, since the
 * store has no notion of who is calling.
 *
 * Seeds its terms from what the two sides actually shook hands on, so the
 * KAM starts from the negotiated numbers rather than a blank form.
 */
function createContract(deal: Deal, kam: { id: string; name: string }): Contract {
  restoreOnce()
  const existing = contractForDeal(snapshot, deal.id)
  if (existing) return existing

  const now = new Date().toISOString()
  const contract: Contract = {
    id: generateId("contract"),
    reference: `AMA-${new Date().getFullYear()}-${String(snapshot.length + 1).padStart(4, "0")}`,
    dealId: deal.id,
    conversationId: deal.conversationId,
    listingTitle: deal.listingTitle,

    buyerId: deal.buyerId,
    buyerName: deal.buyerName,
    sellerId: deal.sellerId,
    sellerName: deal.sellerName,
    kamId: kam.id,
    kamName: kam.name,

    stage: "summary",
    stageHistory: [{ stage: "summary", at: now, by: kam.name, note: "Contract opened from the agreed deal" }],

    terms: {
      pricePerTonneUsd: deal.agreedPricePerTonneUsd,
      quantityMt: deal.agreedQuantityMt,
      incoterm: deal.costing.incoterm,
      paymentTerm: deal.costing.paymentTerm,
      originPort: null,
      destinationPort: null,
      qualitySpec: null,
      notes: null,
    },

    requests: [],
    clauses: seedClauses({
      productSpec: deal.costing?.notes ?? null,
      priceCurrency: `$${deal.agreedPricePerTonneUsd}/t × ${deal.agreedQuantityMt} MT`,
      paymentTerms: deal.costing.paymentTerm,
      incoterms: deal.costing.incoterm,
    }),
    termSheetOpenedAt: null,
    draftBody: null,
    draftVersion: 0,
    amendments: [],
    approvals: { buyer: { ...emptyApproval }, seller: { ...emptyApproval } },
    signatures: { buyer: { ...emptyApproval }, seller: { ...emptyApproval } },
    po: null,
    shipmentDates: null,

    createdAt: now,
    updatedAt: now,
  }

  write([contract, ...snapshot])
  postCard({
    conversationId: deal.conversationId,
    from: "kam",
    fromName: kam.name,
    text: `${kam.name} has opened contract ${contract.reference} for this deal and will guide both sides through it.`,
    card: { kind: "contract", contractId: contract.id },
  })
  return contract
}

function setStage(id: string, stage: ContractStage, by: string, note: string | null = null) {
  restoreOnce()
  const contract = findContract(id)
  if (!contract || contract.stage === stage) return
  updateContract(id, {
    stage,
    stageHistory: [...contract.stageHistory, { stage, at: new Date().toISOString(), by, note }],
  })
}

function updateTerms(id: string, patch: Partial<Contract["terms"]>) {
  restoreOnce()
  const contract = findContract(id)
  if (!contract) return
  updateContract(id, { terms: { ...contract.terms, ...patch } })
}

/**
 * Opens the term sheet for clause-by-clause negotiation — a deliberate KAM
 * action (Stage 4 of the brief starts once the KAM "brings both sides into
 * terms negotiation"), rather than something that just quietly exists the
 * moment a contract is created. Posts the one `term-sheet` card both sides
 * work off of; every clause update after this just changes what that same
 * card shows, so it's only ever posted once per contract.
 */
function openTermSheet(contractId: string, byName: string) {
  restoreOnce()
  const contract = findContract(contractId)
  if (!contract || contract.termSheetOpenedAt) return
  if (contract.stage === "summary") setStage(contractId, "term-sheet", byName, "Term sheet opened")
  updateContract(contractId, { termSheetOpenedAt: new Date().toISOString() })
  postCard({
    conversationId: contract.conversationId,
    from: "kam",
    fromName: byName,
    text: `${byName} opened the term sheet for contract ${contract.reference} — review each clause and agree it with the other side.`,
    card: { kind: "term-sheet", contractId },
  })
}

function findClause(contract: Contract, clauseId: string): TermSheetClause | undefined {
  return contract.clauses.find((clause) => clause.id === clauseId)
}

/** The two trading sides' latest word on a clause — a KAM's own proposal
 *  (e.g. pinning a chat number as a starting suggestion) doesn't count as
 *  either side's agreement, so it's excluded from the comparison. */
function latestPartyProposals(proposals: ClauseProposal[]) {
  const buyer = [...proposals].reverse().find((entry) => entry.by === "buyer")
  const seller = [...proposals].reverse().find((entry) => entry.by === "seller")
  return { buyer, seller }
}

function proposalsAgree(buyer: ClauseProposal | undefined, seller: ClauseProposal | undefined): boolean {
  return !!buyer && !!seller && buyer.value.trim().toLowerCase() === seller.value.trim().toLowerCase()
}

/**
 * One side putting a value on a clause — the first proposal on a fresh
 * clause, a straight confirmation of the standing value, or a counter that
 * changes it. Under trade law any change is a fresh counter-offer that
 * resets whatever the other side had already agreed to, which is exactly
 * what falls out of only comparing the two sides' *latest* proposals: a
 * new counter from either party can never leave a stale "agreed" behind.
 */
function proposeClause(
  contractId: string,
  clauseId: string,
  value: string,
  by: ChatParty,
  byName: string,
  linkedMessageText?: string | null
) {
  restoreOnce()
  const contract = findContract(contractId)
  const clause = contract && findClause(contract, clauseId)
  if (!contract || !clause) return

  const proposal: ClauseProposal = { value, by, byName, at: new Date().toISOString() }
  const proposals = [...clause.proposals, proposal]
  const { buyer, seller } = latestPartyProposals(proposals)
  const agreed = proposalsAgree(buyer, seller)

  updateContract(contractId, {
    clauses: contract.clauses.map((entry) =>
      entry.id === clauseId
        ? {
            ...entry,
            value,
            status: agreed ? "agreed" : "pending",
            proposals,
            linkedMessageText: linkedMessageText !== undefined ? linkedMessageText : entry.linkedMessageText,
            updatedAt: new Date().toISOString(),
          }
        : entry
    ),
  })
  logSystemMessageForConversation(
    contract.conversationId,
    agreed
      ? `${byName} confirmed "${clause.label}" — both sides now agree: ${value}.`
      : `${byName} proposed "${value}" for ${clause.label}.`
  )
}

/** Pulls a clause back to the KAM to mediate — the same "this needs a
 *  human, not just the other side clicking a button" escape hatch
 *  `raiseAmendment` gives the contract draft as a whole. */
function disputeClause(contractId: string, clauseId: string, by: ChatParty, byName: string, note: string | null) {
  restoreOnce()
  const contract = findContract(contractId)
  const clause = contract && findClause(contract, clauseId)
  if (!contract || !clause) return
  updateContract(contractId, {
    clauses: contract.clauses.map((entry) =>
      entry.id === clauseId ? { ...entry, status: "disputed", updatedAt: new Date().toISOString() } : entry
    ),
  })
  logSystemMessageForConversation(
    contract.conversationId,
    `${byName} disputed "${clause.label}"${note ? `: ${note}` : "."}`
  )
}

/** Undoes the most recent proposal on a clause — for a party that
 *  changed their mind before the other side responded. Recomputes
 *  agreement off whatever's left rather than assuming "pending". */
function withdrawClauseProposal(contractId: string, clauseId: string, byName: string) {
  restoreOnce()
  const contract = findContract(contractId)
  const clause = contract && findClause(contract, clauseId)
  if (!contract || !clause || clause.proposals.length === 0) return
  const proposals = clause.proposals.slice(0, -1)
  const { buyer, seller } = latestPartyProposals(proposals)
  const agreed = proposalsAgree(buyer, seller)
  updateContract(contractId, {
    clauses: contract.clauses.map((entry) =>
      entry.id === clauseId
        ? {
            ...entry,
            proposals,
            value: proposals.length > 0 ? proposals[proposals.length - 1].value : null,
            status: agreed ? "agreed" : "pending",
            updatedAt: new Date().toISOString(),
          }
        : entry
    ),
  })
  logSystemMessageForConversation(contract.conversationId, `${byName} withdrew their proposal for "${clause.label}".`)
}

/**
 * Asks one party for a set of details and/or documents, and drops the card
 * that opens the form into the thread — visible to that party and the KAM,
 * never to the counterparty.
 */
function requestTermSheet(
  id: string,
  input: {
    party: "buyer" | "seller"
    title: string
    note: string | null
    fields: Array<Omit<TermSheetField, "id" | "value">>
    documents: Array<Omit<RequestedDocument, "id" | "files">>
  }
): TermSheetRequest | null {
  restoreOnce()
  const contract = findContract(id)
  if (!contract) return null

  const now = new Date().toISOString()
  const request: TermSheetRequest = {
    id: generateId("request"),
    party: input.party,
    title: input.title,
    note: input.note,
    fields: input.fields.map((field) => ({ ...field, id: generateId("field"), value: null })),
    documents: input.documents.map((document) => ({ ...document, id: generateId("doc"), files: [] })),
    status: "open",
    submittedAt: null,
    updatedAt: now,
  }

  updateContract(id, { requests: [...contract.requests, request] })
  if (contract.stage === "summary") setStage(id, "term-sheet", contract.kamName, "Details requested from both sides")

  const recipientName = input.party === "buyer" ? contract.buyerName : contract.sellerName
  postCard({
    conversationId: contract.conversationId,
    from: "kam",
    fromName: contract.kamName,
    text: `${contract.kamName} asked ${recipientName} for: ${request.title}. Tap to fill it in — you can save as you go.`,
    card: { kind: "request", contractId: id, requestId: request.id },
    visibleTo: [input.party, "kam"],
  })
  return request
}

function patchRequest(
  contractId: string,
  requestId: string,
  patch: (request: TermSheetRequest) => TermSheetRequest
) {
  restoreOnce()
  const contract = findContract(contractId)
  if (!contract) return
  updateContract(contractId, {
    requests: contract.requests.map((request) =>
      request.id === requestId ? { ...patch(request), updatedAt: new Date().toISOString() } : request
    ),
  })
}

/**
 * Saves whatever has been typed so far without submitting. This is what
 * makes the form progressive: a party can open the modal, fill two fields,
 * close it, and come back tomorrow to the rest — nothing is lost and
 * nothing is sent until they say so.
 */
function saveRequestDraft(contractId: string, requestId: string, values: Record<string, string>) {
  patchRequest(contractId, requestId, (request) => ({
    ...request,
    fields: request.fields.map((field) =>
      field.id in values ? { ...field, value: values[field.id] || null } : field
    ),
  }))
}

function attachFile(
  contractId: string,
  requestId: string,
  documentId: string,
  file: { name: string; size: number }
) {
  patchRequest(contractId, requestId, (request) => ({
    ...request,
    documents: request.documents.map((document) =>
      document.id === documentId
        ? {
            ...document,
            files: [
              ...document.files,
              { ...file, id: generateId("file"), uploadedAt: new Date().toISOString() },
            ],
          }
        : document
    ),
  }))
}

/** Uploading the wrong file shouldn't be permanent — a party can pull one
 *  back any time the request is still open. */
function removeFile(contractId: string, requestId: string, documentId: string, fileId: string) {
  patchRequest(contractId, requestId, (request) => ({
    ...request,
    documents: request.documents.map((document) =>
      document.id === documentId
        ? { ...document, files: document.files.filter((file) => file.id !== fileId) }
        : document
    ),
  }))
}

/** Everything required actually supplied — what the submit button gates on
 *  and what the card's progress line counts. */
function requestProgress(request: TermSheetRequest): { done: number; total: number; complete: boolean } {
  const requiredFields = request.fields.filter((field) => field.required)
  const requiredDocuments = request.documents.filter((document) => document.required)
  const total = requiredFields.length + requiredDocuments.length
  const done =
    requiredFields.filter((field) => !!field.value?.trim()).length +
    requiredDocuments.filter((document) => document.files.length > 0).length
  return { done, total, complete: done === total }
}

function submitRequest(contractId: string, requestId: string, byName: string) {
  restoreOnce()
  const contract = findContract(contractId)
  const request = contract?.requests.find((entry) => entry.id === requestId)
  if (!contract || !request || request.status === "submitted") return
  if (!requestProgress(request).complete) return

  patchRequest(contractId, requestId, (entry) => ({
    ...entry,
    status: "submitted",
    submittedAt: new Date().toISOString(),
  }))
  logSystemMessageForConversation(
    contract.conversationId,
    `${byName} completed "${request.title}".`,
    [request.party, "kam"]
  )
}

/**
 * The buyer locking in the term sheet as a real order. Only possible once
 * every clause is agreed — this is the gate that makes "PO issued" mean
 * something rather than just a label. If the buyer issues it exactly as
 * agreed, trade law treats the PO itself as the acceptance and the
 * contract forms the instant it lands, so this advances straight to
 * `draft`. If the buyer changes anything at this exact moment (`overrides`
 * keyed by clause), that change is a fresh counter-offer — the affected
 * clauses flip back to `disputed` and the contract stays put until the
 * seller confirms it (see `confirmPurchaseOrder`).
 */
function issuePurchaseOrder(
  contractId: string,
  byName: string,
  overrides: Partial<Record<ClauseKey, string>> = {}
): PurchaseOrder | null {
  restoreOnce()
  const contract = findContract(contractId)
  if (!contract || !allClausesAgreed(contract)) return null

  const now = new Date().toISOString()
  const terms: Partial<Record<ClauseKey, string>> = {}
  const deviatedClauses: ClauseKey[] = []
  const clauses = contract.clauses.map((clause) => {
    const overrideValue = overrides[clause.key]
    const baseline = clause.value ?? ""
    if (overrideValue === undefined) {
      terms[clause.key] = baseline
      return clause
    }
    terms[clause.key] = overrideValue
    if (overrideValue.trim().toLowerCase() === baseline.trim().toLowerCase()) return clause
    deviatedClauses.push(clause.key)
    return {
      ...clause,
      value: overrideValue,
      status: "disputed" as ClauseStatus,
      proposals: [...clause.proposals, { value: overrideValue, by: "buyer" as ChatParty, byName, at: now }],
      updatedAt: now,
    }
  })

  const po: PurchaseOrder = {
    issuedAt: now,
    issuedByName: byName,
    terms,
    deviatedClauses,
    status: deviatedClauses.length === 0 ? "auto-accepted" : "pending-seller-confirmation",
    sellerConfirmedAt: null,
    sellerConfirmedBy: null,
    cancelledAt: null,
    cancelledBy: null,
  }

  updateContract(contractId, { clauses, po })
  if (po.status === "auto-accepted") {
    setStage(contractId, "draft", byName, `PO issued for ${contract.reference} — matched the term sheet exactly`)
  }
  postCard({
    conversationId: contract.conversationId,
    from: "buyer",
    fromName: byName,
    text:
      po.status === "auto-accepted"
        ? `${byName} issued PO ${contract.reference} — it matches the agreed term sheet exactly, so this is now a binding order.`
        : `${byName} issued PO ${contract.reference} with changes to ${deviatedClauses.length} clause${deviatedClauses.length === 1 ? "" : "s"} — this is a counter-offer and needs ${contract.sellerName}'s confirmation.`,
    card: { kind: "po", contractId },
  })
  return po
}

/** The seller's yes to a PO that changed something — re-agrees the
 *  clauses the buyer touched at the buyer's new values and, only now,
 *  advances the contract. */
function confirmPurchaseOrder(contractId: string, sellerName: string) {
  restoreOnce()
  const contract = findContract(contractId)
  if (!contract?.po || contract.po.status !== "pending-seller-confirmation") return
  const now = new Date().toISOString()
  const deviated = contract.po.deviatedClauses
  const clauses = contract.clauses.map((clause) =>
    deviated.includes(clause.key)
      ? {
          ...clause,
          status: "agreed" as ClauseStatus,
          proposals: [
            ...clause.proposals,
            { value: clause.value ?? "", by: "seller" as ChatParty, byName: sellerName, at: now },
          ],
          updatedAt: now,
        }
      : clause
  )
  updateContract(contractId, {
    clauses,
    po: { ...contract.po, status: "confirmed", sellerConfirmedAt: now, sellerConfirmedBy: sellerName },
  })
  setStage(contractId, "draft", sellerName, `PO ${contract.reference} confirmed by seller`)
  logSystemMessageForConversation(
    contract.conversationId,
    `${sellerName} confirmed PO ${contract.reference} — this is now a binding order.`
  )
}

/** The buyer pulling back a PO before the seller has confirmed it —
 *  releases the clauses it touched back to ordinary negotiation instead of
 *  leaving them stuck disputed against a PO that no longer stands. */
function cancelPurchaseOrder(contractId: string, byName: string) {
  restoreOnce()
  const contract = findContract(contractId)
  if (!contract?.po || contract.po.status !== "pending-seller-confirmation") return
  const now = new Date().toISOString()
  const deviated = contract.po.deviatedClauses
  const clauses = contract.clauses.map((clause) =>
    deviated.includes(clause.key) && clause.status === "disputed"
      ? { ...clause, status: "pending" as ClauseStatus, updatedAt: now }
      : clause
  )
  updateContract(contractId, { clauses, po: { ...contract.po, cancelledAt: now, cancelledBy: byName } })
  logSystemMessageForConversation(contract.conversationId, `${byName} withdrew PO ${contract.reference}.`)
}

/**
 * Publishes a draft for both sides to read. Moves straight to `review`,
 * since a draft nobody has been asked to look at isn't waiting on the KAM
 * any more — it's waiting on them.
 */
function publishDraft(contractId: string, body: string, byName: string) {
  restoreOnce()
  const contract = findContract(contractId)
  if (!contract) return
  const version = contract.draftVersion + 1
  updateContract(contractId, {
    draftBody: body,
    draftVersion: version,
    // A re-issued draft resets both sides' agreement: nobody has read this one yet.
    approvals: { buyer: { ...emptyApproval }, seller: { ...emptyApproval } },
  })
  setStage(contractId, "review", byName, `Draft v${version} shared with both sides`)
  postCard({
    conversationId: contract.conversationId,
    from: "kam",
    fromName: contract.kamName,
    text: `${byName} shared draft v${version} of contract ${contract.reference}. Both sides need to agree before it can be signed.`,
    card: { kind: "final-draft", contractId },
  })
}

/** One side agreeing to the draft. The contract only moves on when the
 *  other side has too — a one-sided yes changes nothing. */
function approveDraft(contractId: string, party: "buyer" | "seller", byName: string, note: string | null = null) {
  restoreOnce()
  const contract = findContract(contractId)
  if (!contract || !contract.draftBody) return
  const approvals = {
    ...contract.approvals,
    [party]: { agreed: true, at: new Date().toISOString(), by: byName, note },
  }
  updateContract(contractId, { approvals })
  logSystemMessageForConversation(contract.conversationId, `${byName} agreed to draft v${contract.draftVersion}.`)
  if (approvals.buyer.agreed && approvals.seller.agreed) {
    setStage(contractId, "signatures", contract.kamName, "Both sides agreed the draft")
    logSystemMessageForConversation(
      contract.conversationId,
      `Both sides have agreed draft v${contract.draftVersion} — contract ${contract.reference} is ready to sign.`
    )
  }
}

/** Anything either side wants changed before they'll agree. Raising one
 *  pulls the contract back to `amendments` — the KAM owns it again. */
function raiseAmendment(contractId: string, by: ChatParty, byName: string, text: string) {
  restoreOnce()
  const contract = findContract(contractId)
  if (!contract) return
  const amendment: ContractAmendment = {
    id: generateId("amendment"),
    raisedBy: by,
    raisedByName: byName,
    text,
    at: new Date().toISOString(),
    resolved: false,
    resolvedAt: null,
  }
  updateContract(contractId, { amendments: [...contract.amendments, amendment] })
  setStage(contractId, "amendments", byName, "Change requested")
  logSystemMessageForConversation(contract.conversationId, `${byName} asked for a change: ${text}`)
}

function resolveAmendment(contractId: string, amendmentId: string) {
  restoreOnce()
  const contract = findContract(contractId)
  if (!contract) return
  updateContract(contractId, {
    amendments: contract.amendments.map((amendment) =>
      amendment.id === amendmentId
        ? { ...amendment, resolved: true, resolvedAt: new Date().toISOString() }
        : amendment
    ),
  })
}

function signContract(contractId: string, party: "buyer" | "seller", byName: string) {
  restoreOnce()
  const contract = findContract(contractId)
  if (!contract || contract.stage !== "signatures") return
  const signatures = {
    ...contract.signatures,
    [party]: { agreed: true, at: new Date().toISOString(), by: byName, note: null },
  }
  updateContract(contractId, { signatures })
  logSystemMessageForConversation(contract.conversationId, `${byName} signed contract ${contract.reference}.`)
  if (signatures.buyer.agreed && signatures.seller.agreed) {
    setStage(contractId, "final", contract.kamName, "Signed by both sides")
    logSystemMessageForConversation(
      contract.conversationId,
      `Contract ${contract.reference} is fully signed. Shipment planning starts now.`
    )
  }
}

/**
 * Offers the buyer the sail dates the KAM can actually honour. Re-asking
 * replaces the previous menu rather than adding a second one, so there's
 * never a stale set of dates still looking pickable.
 */
function askShipmentDates(
  contractId: string,
  options: Array<Omit<ShipmentDateOption, "id">>,
  byName: string
) {
  restoreOnce()
  const contract = findContract(contractId)
  if (!contract) return
  const poll: ShipmentDatePoll = {
    id: generateId("dates"),
    options: options.map((option) => ({ ...option, id: generateId("option") })),
    chosenOptionId: null,
    chosenBy: null,
    chosenAt: null,
    askedAt: new Date().toISOString(),
  }
  updateContract(contractId, { shipmentDates: poll })
  postCard({
    conversationId: contract.conversationId,
    from: "kam",
    fromName: byName,
    text: `${byName} offered ${poll.options.length} shipping dates — ${contract.buyerName}, pick the one that suits you.`,
    card: { kind: "shipment-dates", contractId },
  })
}

function chooseShipmentDate(contractId: string, optionId: string, byName: string) {
  restoreOnce()
  const contract = findContract(contractId)
  if (!contract?.shipmentDates || contract.shipmentDates.chosenOptionId) return
  const option = contract.shipmentDates.options.find((entry) => entry.id === optionId)
  if (!option) return
  updateContract(contractId, {
    shipmentDates: {
      ...contract.shipmentDates,
      chosenOptionId: optionId,
      chosenBy: byName,
      chosenAt: new Date().toISOString(),
    },
  })
  logSystemMessageForConversation(
    contract.conversationId,
    `${byName} picked ${new Date(option.date).toLocaleDateString("en", { day: "numeric", month: "long", year: "numeric" })} for shipment. ${contract.kamName} has been notified.`
  )
}

/** How far along the paperwork is, for a progress bar. */
function contractProgress(contract: Contract): { cleared: number; total: number } {
  return {
    cleared: CONTRACT_STAGE_ORDER.indexOf(contract.stage) + 1,
    total: CONTRACT_STAGE_ORDER.length,
  }
}

export {
  useContracts,
  seedContractsIfEmpty,
  contractForDeal,
  contractsForParty,
  requestsForParty,
  requestProgress,
  contractProgress,
  createContract,
  setStage,
  updateTerms,
  allClausesAgreed,
  openTermSheet,
  proposeClause,
  disputeClause,
  withdrawClauseProposal,
  requestTermSheet,
  saveRequestDraft,
  attachFile,
  removeFile,
  submitRequest,
  issuePurchaseOrder,
  confirmPurchaseOrder,
  cancelPurchaseOrder,
  publishDraft,
  approveDraft,
  raiseAmendment,
  resolveAmendment,
  signContract,
  askShipmentDates,
  chooseShipmentDate,
}
