"use client"

import * as React from "react"
import {
  FileTextIcon,
  MessageCircleQuestionIcon,
  PackageIcon,
  ShieldCheckIcon,
  ShipIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react"

import { logSystemMessageForConversation, postCard, type ChatParty } from "@/features/marketplace/conversation-store"

const STORAGE_KEY = "amama.marketplace.formRequests"

export type FormFieldType = "text" | "number" | "date" | "select" | "textarea"

export type FormField = {
  id: string
  label: string
  type: FormFieldType
  required: boolean
  options?: string[]
  help: string | null
  value: string | null
}

/** Metadata only, same convention as the contract term sheet's own
 *  `UploadedFile` — no real bytes here either. */
export type FormFile = { id: string; name: string; size: number; uploadedAt: string }

export type FormDocumentSlot = {
  id: string
  label: string
  required: boolean
  help: string | null
  files: FormFile[]
}

export type FormTemplateId = "shipping" | "payment" | "companyDocs" | "productSpec" | "qualityCerts" | "custom"

/**
 * One request, sent by any party in a conversation to any other — the
 * same "ask for details, they fill it in when ready" shape the contract
 * term sheet already proved out, just conversation-scoped instead of
 * contract-scoped, so it works from the very first message rather than
 * only once a KAM has opened a contract. `visibleTo` carries the same
 * sandboxing convention as everything else in `conversation-store.ts` —
 * only set when a KAM addresses one specific side of a thread the other
 * side shouldn't see this in; a buyer or seller sending directly to their
 * one counterpart leaves it unset, since there's no third party to hide
 * it from.
 */
export type ConversationFormRequest = {
  id: string
  conversationId: string
  templateId: FormTemplateId
  title: string
  note: string | null
  createdBy: ChatParty
  createdByName: string
  targetParty: ChatParty
  targetName: string
  fields: FormField[]
  documents: FormDocumentSlot[]
  status: "open" | "submitted" | "cancelled"
  submittedAt: string | null
  cancelledAt: string | null
  cancelledBy: string | null
  createdAt: string
  updatedAt: string
}

/** The "+" picker's whole catalog — six tiles, each usable by any party
 *  (there's no "KAM-only" template any more). `custom` is the escape
 *  hatch: a single free-text question the sender writes themselves,
 *  rather than a fixed list that can't cover an unusual ask. */
export const FORM_TEMPLATES: {
  id: FormTemplateId
  label: string
  icon: LucideIcon
  title: string
  fields: Array<Omit<FormField, "id" | "value">>
  documents: Array<Omit<FormDocumentSlot, "id" | "files">>
}[] = [
  {
    id: "shipping",
    label: "Shipping details",
    icon: ShipIcon,
    title: "Shipping details",
    fields: [
      { label: "Incoterm", type: "text", required: true, help: null },
      { label: "Destination port", type: "text", required: true, help: null },
      { label: "Preferred delivery window", type: "text", required: false, help: null },
    ],
    documents: [],
  },
  {
    id: "payment",
    label: "Payment details",
    icon: WalletIcon,
    title: "Payment details",
    fields: [
      { label: "Preferred payment term", type: "text", required: true, help: null },
      { label: "Bank name", type: "text", required: true, help: null },
      { label: "SWIFT / BIC", type: "text", required: false, help: null },
    ],
    documents: [],
  },
  {
    id: "companyDocs",
    label: "Company documents",
    icon: FileTextIcon,
    title: "Company documents",
    fields: [],
    documents: [
      { label: "Business registration", required: true, help: null },
      { label: "Tax ID / GSTIN", required: true, help: null },
    ],
  },
  {
    id: "productSpec",
    label: "Product specification",
    icon: PackageIcon,
    title: "Product specification",
    fields: [
      { label: "Grade", type: "text", required: true, help: null },
      { label: "Packaging", type: "text", required: true, help: null },
      { label: "Quantity (MT)", type: "number", required: true, help: null },
      { label: "Quality spec", type: "textarea", required: false, help: null },
    ],
    documents: [],
  },
  {
    id: "qualityCerts",
    label: "Quality certificates",
    icon: ShieldCheckIcon,
    title: "Quality certificates",
    fields: [],
    documents: [
      { label: "Lab / quality report", required: true, help: null },
      { label: "Certificate of origin", required: false, help: null },
    ],
  },
  {
    id: "custom",
    label: "Custom question",
    icon: MessageCircleQuestionIcon,
    title: "Quick question",
    fields: [{ label: "Your question", type: "textarea", required: true, help: null }],
    documents: [],
  },
]

let snapshot: ConversationFormRequest[] = []
let restored = false
const listeners = new Set<() => void>()
const emptyRequests: ConversationFormRequest[] = []

function restoreOnce() {
  if (restored || typeof window === "undefined") return
  restored = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) snapshot = JSON.parse(raw) as ConversationFormRequest[]
  } catch {
    // Private mode or blocked storage — carry on with nothing asked yet.
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
  return emptyRequests
}

function write(next: ConversationFormRequest[]) {
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

function useFormRequests(): ConversationFormRequest[] {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

function findFormRequest(id: string): ConversationFormRequest | undefined {
  restoreOnce()
  return snapshot.find((request) => request.id === id)
}

function updateFormRequest(id: string, patch: Partial<ConversationFormRequest>) {
  write(
    snapshot.map((request) =>
      request.id === id ? { ...request, ...patch, updatedAt: new Date().toISOString() } : request
    )
  )
}

/** Creates the request and drops its card into the thread in one step —
 *  same pairing `proposeDeal`/`requestTermSheet` already do, so a form
 *  never exists without the message that points at it. */
function createFormRequest(input: {
  conversationId: string
  templateId: FormTemplateId
  title: string
  note: string | null
  createdBy: ChatParty
  createdByName: string
  targetParty: ChatParty
  targetName: string
  fields: Array<Omit<FormField, "id" | "value">>
  documents: Array<Omit<FormDocumentSlot, "id" | "files">>
  visibleTo?: ChatParty[]
}): ConversationFormRequest {
  restoreOnce()
  const now = new Date().toISOString()
  const request: ConversationFormRequest = {
    id: generateId("formreq"),
    conversationId: input.conversationId,
    templateId: input.templateId,
    title: input.title,
    note: input.note,
    createdBy: input.createdBy,
    createdByName: input.createdByName,
    targetParty: input.targetParty,
    targetName: input.targetName,
    fields: input.fields.map((field) => ({ ...field, id: generateId("field"), value: null })),
    documents: input.documents.map((document) => ({ ...document, id: generateId("doc"), files: [] })),
    status: "open",
    submittedAt: null,
    cancelledAt: null,
    cancelledBy: null,
    createdAt: now,
    updatedAt: now,
  }
  write([request, ...snapshot])
  postCard({
    conversationId: input.conversationId,
    from: input.createdBy,
    fromName: input.createdByName,
    text: `${input.createdByName} asked ${input.targetName} for: ${input.title}. Tap to fill it in — you can save as you go.`,
    card: { kind: "form-request", requestId: request.id },
    visibleTo: input.visibleTo,
  })
  return request
}

function saveFormDraft(id: string, values: Record<string, string>) {
  const request = findFormRequest(id)
  if (!request) return
  updateFormRequest(id, {
    fields: request.fields.map((field) => (field.id in values ? { ...field, value: values[field.id] || null } : field)),
  })
}

function attachFormFile(id: string, documentId: string, file: { name: string; size: number }) {
  const request = findFormRequest(id)
  if (!request) return
  updateFormRequest(id, {
    documents: request.documents.map((document) =>
      document.id === documentId
        ? { ...document, files: [...document.files, { ...file, id: generateId("file"), uploadedAt: new Date().toISOString() }] }
        : document
    ),
  })
}

function removeFormFile(id: string, documentId: string, fileId: string) {
  const request = findFormRequest(id)
  if (!request) return
  updateFormRequest(id, {
    documents: request.documents.map((document) =>
      document.id === documentId
        ? { ...document, files: document.files.filter((file) => file.id !== fileId) }
        : document
    ),
  })
}

/** Everything required actually supplied — same shape the term sheet's
 *  own `requestProgress` uses, so both the card's progress line and the
 *  submit button gate on it identically. */
function formProgress(request: ConversationFormRequest): { done: number; total: number; complete: boolean } {
  const requiredFields = request.fields.filter((field) => field.required)
  const requiredDocuments = request.documents.filter((document) => document.required)
  const total = requiredFields.length + requiredDocuments.length
  const done =
    requiredFields.filter((field) => !!field.value?.trim()).length +
    requiredDocuments.filter((document) => document.files.length > 0).length
  return { done, total, complete: done === total }
}

function submitFormRequest(id: string, byName: string) {
  const request = findFormRequest(id)
  if (!request || request.status !== "open") return
  if (!formProgress(request).complete) return
  updateFormRequest(id, { status: "submitted", submittedAt: new Date().toISOString() })
  logSystemMessageForConversation(request.conversationId, `${byName} completed "${request.title}".`)
}

/** Calling off a request that's no longer needed — the sender changed
 *  their mind, or asked the wrong party. Leaves the card in the thread,
 *  dimmed and struck through, rather than deleting it outright. */
function cancelFormRequest(id: string, byName: string) {
  const request = findFormRequest(id)
  if (!request || request.status !== "open") return
  updateFormRequest(id, {
    status: "cancelled",
    cancelledAt: new Date().toISOString(),
    cancelledBy: byName,
  })
  logSystemMessageForConversation(request.conversationId, `${byName} cancelled "${request.title}".`)
}

export {
  useFormRequests,
  findFormRequest,
  createFormRequest,
  saveFormDraft,
  attachFormFile,
  removeFormFile,
  formProgress,
  submitFormRequest,
  cancelFormRequest,
}
