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

export type ContractAmendment = {
  id: string
  raisedBy: ChatParty
  raisedByName: string
  text: string
  at: string
  resolved: boolean
  resolvedAt: string | null
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
  draftBody: string | null
  draftVersion: number
  amendments: ContractAmendment[]
  approvals: { buyer: PartyApproval; seller: PartyApproval }
  signatures: { buyer: PartyApproval; seller: PartyApproval }
  shipmentDates: ShipmentDatePoll | null

  createdAt: string
  updatedAt: string
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
    if (raw) snapshot = JSON.parse(raw) as Contract[]
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
    draftBody: null,
    draftVersion: 0,
    amendments: [],
    approvals: { buyer: { ...emptyApproval }, seller: { ...emptyApproval } },
    signatures: { buyer: { ...emptyApproval }, seller: { ...emptyApproval } },
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
  requestTermSheet,
  saveRequestDraft,
  attachFile,
  removeFile,
  submitRequest,
  publishDraft,
  approveDraft,
  raiseAmendment,
  resolveAmendment,
  signContract,
  askShipmentDates,
  chooseShipmentDate,
}
