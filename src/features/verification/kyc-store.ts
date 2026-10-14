"use client"

import * as React from "react"

import { deleteFiles } from "@/features/local-db/file-store"
import { createPersistentStore, localId } from "@/features/local-db/persistent-store"
import type { OnboardingRole } from "@/features/onboarding/types"
import { documentLabel, seedKycApplications } from "@/features/verification/kyc-seed"
import type {
  DocumentVersion,
  KycActor,
  KycApplication,
  KycAuthor,
  KycComment,
  KycDocument,
  KycTicket,
  KycTicketItem,
  KycTicketOrigin,
  ReviewStatus,
} from "@/features/verification/kyc-types"
import { deriveTicketStatus, kycTicketNumber } from "@/features/verification/ticket"

/**
 * Every KYC application, both sides of every ticket: the applicant's
 * documents with each upload kept, the reviewer's verdicts, and the
 * conversation between them. One account has many tickets over time —
 * the first submission, updates the account holder raises, and requests
 * from their KAM — each covering one or more documents. Lives in
 * localStorage; the files themselves are in IndexedDB.
 */
const store = createPersistentStore<KycApplication[]>("amama.kyc.applications", seedKycApplications, [])

export type StaffActor = { id: string; name: string; title?: string }
export type UploadedVersion = { name: string; size: number; fileId: string | null; expiresAt?: string | null }

const now = () => new Date().toISOString()

const staffAuthor = (by: StaffActor): KycAuthor => ({ kind: "staff", id: by.id, name: by.name, title: by.title })
const applicantAuthor = (application: KycApplication, name: string): KycAuthor => ({ kind: "applicant", id: application.userId, name })
const systemAuthor: KycAuthor = { kind: "system", id: "system", name: "amama" }

const comment = (author: KycAuthor, text: string, docId: string | null = null, ticketId: string | null = null): KycComment => ({
  id: localId("c"),
  author,
  text,
  at: now(),
  docId,
  ticketId,
})

const newVersion = (file: UploadedVersion): DocumentVersion => ({
  id: localId("v"),
  name: file.name,
  size: file.size,
  fileId: file.fileId,
  uploadedAt: now(),
  expiresAt: file.expiresAt ?? null,
})

/** A document's display name for timeline entries — its own label for
 *  one a KAM asked for, the catalog's otherwise. */
const labelOf = (document: KycDocument) => document.label ?? documentLabel(document.id)

/* ------------------------------ Ticket helpers --------------------------- */

const onboardingTicketId = (application: Pick<KycApplication, "role" | "email">) => kycTicketNumber(application.role, application.email, 1)

/** Which ticket a timeline entry belongs to — entries from before tickets
 *  existed belong to the first one. */
const ticketOfComment = (application: KycApplication, entry: KycComment) => entry.ticketId ?? onboardingTicketId(application)

function ticketComments(application: KycApplication, ticketId: string): KycComment[] {
  return application.comments.filter((entry) => ticketOfComment(application, entry) === ticketId)
}

/** The newest unresolved ticket that covers this document, if any — a new
 *  upload for it belongs there. */
function openTicketFor(application: KycApplication, docId: string): KycTicket | null {
  for (let index = application.tickets.length - 1; index >= 0; index--) {
    const ticket = application.tickets[index]
    if (!ticket.resolvedAt && ticket.items.some((item) => item.docId === docId)) return ticket
  }
  return null
}

const nextSeq = (application: KycApplication) => application.tickets.reduce((max, ticket) => Math.max(max, ticket.seq), 0) + 1

/** The account's KAM, by name, from whatever ticket or message names them. */
function accountKam(application: KycApplication): KycActor | null {
  const id = application.assigneeId
  if (!id) return null
  const fromTicket = application.tickets.find((ticket) => ticket.assignee?.id === id)?.assignee
  if (fromTicket) return fromTicket
  const fromComment = application.comments.find((entry) => entry.author.id === id)?.author
  return fromComment ? { id, name: fromComment.name } : null
}

function makeTicket(
  application: KycApplication,
  input: { origin: KycTicketOrigin; title: string; openedBy: KycAuthor; assignee: KycActor | null; items: KycTicketItem[]; seq?: number }
): KycTicket {
  const seq = input.seq ?? nextSeq(application)
  return {
    id: kycTicketNumber(application.role, application.email, seq),
    seq,
    origin: input.origin,
    title: input.title,
    status: "open",
    openedAt: now(),
    openedBy: input.openedBy,
    assignee: input.assignee,
    items: input.items,
    resolvedAt: null,
    resolvedBy: null,
  }
}

const item = (docId: string, patch: Partial<KycTicketItem> = {}): KycTicketItem => ({
  docId,
  kind: "submitted",
  status: "pending",
  versionId: null,
  note: null,
  requestedBy: null,
  reviewedBy: null,
  ...patch,
})

/** Builds the first ticket for data written before tickets existed: one
 *  onboarding ticket covering every document, with the account's state. */
function legacyTickets(application: KycApplication): KycTicket[] {
  if (!application.submittedAt) return []
  const assigneeName = application.assigneeId
    ? (application.comments.find((entry) => entry.author.id === application.assigneeId)?.author.name ?? application.assigneeId)
    : null
  return [
    {
      id: onboardingTicketId(application),
      seq: 1,
      origin: "onboarding",
      title: "Onboarding KYC",
      status: "open",
      openedAt: application.submittedAt,
      openedBy: { kind: "applicant", id: application.userId, name: application.fullName },
      assignee: application.assigneeId && assigneeName ? { id: application.assigneeId, name: assigneeName } : null,
      items: application.documents.map((document) =>
        item(document.id, {
          kind: document.requestedBy ? "new" : "submitted",
          status: document.reviewStatus,
          versionId: document.versions.at(-1)?.id ?? null,
          note: document.reviewNote,
          requestedBy: document.requestedBy ? { id: document.requestedBy.id, name: document.requestedBy.name } : null,
          reviewedBy: document.reviewedBy,
        })
      ),
      resolvedAt: application.reviewStatus === "approved" ? (application.reviewedAt ?? application.submittedAt) : null,
      resolvedBy: application.reviewStatus === "approved" && application.reviewedByAdminId ? { id: application.reviewedByAdminId, name: application.reviewedByName ?? "" } : null,
    },
  ]
}

const normalized = new WeakMap<KycApplication, KycApplication>()

/** Fills in tickets and drafts on an application stored before they
 *  existed. Cached per object, so reads stay referentially stable. */
function withTickets(application: KycApplication): KycApplication {
  if (Array.isArray(application.tickets) && Array.isArray(application.drafts)) return application
  const cached = normalized.get(application)
  if (cached) return cached
  const base = { ...application, tickets: application.tickets ?? legacyTickets(application), drafts: application.drafts ?? [] }
  const next = { ...base, tickets: base.tickets.map((ticket) => ({ ...ticket, status: deriveTicketStatus(base, ticket) })) }
  normalized.set(application, next)
  return next
}

/** Where the account stands, from what's on it: approved stays approved —
 *  later tickets never lock an account again; before that, anything the
 *  applicant still owes means it's waiting on them. */
function deriveStatus(application: KycApplication): ReviewStatus {
  if (application.reviewStatus === "approved") return "approved"
  if (!application.submittedAt) return "not-submitted"
  const owes =
    application.reviewerNote !== null ||
    application.documents.some((document) => document.reviewStatus === "rejected" || (document.required && document.reviewStatus === "missing"))
  return owes ? "changes-requested" : "pending"
}

/** After every write: a later ticket whose documents are all approved (or
 *  that has none left) resolves itself, then every status is re-derived. */
function settle(application: KycApplication): KycApplication {
  const extra: KycComment[] = []
  const tickets = application.tickets.map((ticket) => {
    if (ticket.resolvedAt || ticket.origin === "onboarding") return ticket
    if (ticket.items.length > 0 && !ticket.items.every((entry) => entry.status === "approved")) return ticket
    const last = ticket.items
      .map((entry) => entry.reviewedBy)
      .filter((by): by is NonNullable<typeof by> => !!by)
      .sort((a, b) => a.at.localeCompare(b.at))
      .at(-1)
    extra.push(comment(systemAuthor, ticket.items.length > 0 ? "Every document approved — ticket resolved" : "Nothing left on this ticket — closed", null, ticket.id))
    return { ...ticket, resolvedAt: now(), resolvedBy: last ? { id: last.id, name: last.name } : null }
  })
  const next = { ...application, tickets, comments: [...application.comments, ...extra] }
  return {
    ...next,
    reviewStatus: deriveStatus(next),
    tickets: next.tickets.map((ticket) => ({ ...ticket, status: deriveTicketStatus(next, ticket) })),
  }
}

function update(role: OnboardingRole, userId: string, change: (application: KycApplication) => KycApplication) {
  store.set((applications) =>
    applications.map((raw) => {
      if (raw.role !== role || raw.userId !== userId) return raw
      return settle(change(withTickets(raw)))
    })
  )
}

const findApplication = (role: OnboardingRole, userId: string) => {
  const raw = store.get().find((application) => application.role === role && application.userId === userId)
  return raw ? withTickets(raw) : null
}

const patchDocument = (application: KycApplication, docId: string, patch: (document: KycDocument) => KycDocument): KycApplication => ({
  ...application,
  documents: application.documents.map((document) => (document.id === docId ? patch(document) : document)),
})

const patchTicket = (application: KycApplication, ticketId: string, patch: (ticket: KycTicket) => KycTicket): KycApplication => ({
  ...application,
  tickets: application.tickets.map((ticket) => (ticket.id === ticketId ? patch(ticket) : ticket)),
})

const patchItem = (ticket: KycTicket, docId: string, patch: (entry: KycTicketItem) => KycTicketItem): KycTicket => ({
  ...ticket,
  items: ticket.items.map((entry) => (entry.docId === docId ? patch(entry) : entry)),
})

const ticketById = (application: KycApplication, ticketId: string | null | undefined) =>
  ticketId ? (application.tickets.find((ticket) => ticket.id === ticketId) ?? null) : null

/** Adds an upload to a document and records it on the ticket it belongs
 *  to, putting both back in review. */
function attachUpload(application: KycApplication, ticket: KycTicket | null, docId: string, version: DocumentVersion): KycApplication {
  let next = patchDocument(application, docId, (document) => ({
    ...document,
    reviewStatus: "pending",
    reviewNote: null,
    reviewedBy: null,
    versions: [...document.versions, version],
  }))
  if (ticket) {
    next = patchTicket(next, ticket.id, (current) =>
      patchItem(current, docId, (entry) => ({ ...entry, status: "pending", versionId: version.id, reviewedBy: null }))
    )
    if (ticket.origin === "onboarding") next = { ...next, reviewerNote: null }
  }
  return next
}

/* ----------------------------- Applicant side ---------------------------- */

type SubmitInput = {
  role: OnboardingRole
  applicant: Pick<KycApplication, "email" | "fullName" | "companyName" | "entityType" | "sellerSubType" | "country">
  documents: { id: string; required: boolean; file: UploadedVersion }[]
}

/** The first submission — or a fresh one, replacing a draft that never
 *  went in. Opens the account's first ticket. */
function submitApplication({ role, applicant, documents }: SubmitInput) {
  const at = now()
  const userId = applicant.email.trim().toLowerCase()
  const kycDocuments: KycDocument[] = documents.map(({ id, required, file }) => ({
    id,
    required,
    reviewStatus: "pending",
    reviewNote: null,
    reviewedBy: null,
    requestedBy: null,
    versions: [{ ...newVersion(file), uploadedAt: at }],
  }))
  const base: KycApplication = {
    userId,
    role,
    ...applicant,
    email: userId,
    reviewStatus: "pending",
    reviewerNote: null,
    reviewedByAdminId: null,
    reviewedByName: null,
    submittedAt: at,
    reviewedAt: null,
    assigneeId: null,
    documents: kycDocuments,
    comments: [],
    tickets: [],
    drafts: [],
  }
  const ticket = {
    ...makeTicket(base, {
      seq: 1,
      origin: "onboarding",
      title: "Onboarding KYC",
      openedBy: applicantAuthor(base, applicant.fullName),
      assignee: null,
      items: kycDocuments.map((document) => item(document.id, { versionId: document.versions[0].id })),
    }),
    openedAt: at,
  }
  const application = settle({
    ...base,
    tickets: [ticket],
    comments: [{ ...comment(systemAuthor, `Submitted ${kycDocuments.length} documents for review`, null, ticket.id), at }],
  })
  store.set((applications) => [...applications.filter((entry) => !(entry.role === role && entry.userId === userId)), application])
}

/**
 * Skipping the documents step: the application exists, with every
 * document listed — uploaded ones carried over, the rest waiting — but
 * nothing goes to a reviewer until `submitStartedApplication`.
 */
function startApplication({
  role,
  applicant,
  documents,
}: {
  role: OnboardingRole
  applicant: SubmitInput["applicant"]
  documents: { id: string; required: boolean; file: UploadedVersion | null }[]
}) {
  const at = now()
  const userId = applicant.email.trim().toLowerCase()
  const application: KycApplication = {
    userId,
    role,
    ...applicant,
    email: userId,
    reviewStatus: "not-submitted",
    reviewerNote: null,
    reviewedByAdminId: null,
    reviewedByName: null,
    submittedAt: null,
    reviewedAt: null,
    assigneeId: null,
    documents: documents.map(({ id, required, file }) => ({
      id,
      required,
      reviewStatus: file ? "pending" : "missing",
      reviewNote: null,
      reviewedBy: null,
      requestedBy: null,
      versions: file ? [{ ...newVersion(file), uploadedAt: at }] : [],
    })),
    comments: [{ ...comment(systemAuthor, "Started KYC — documents still to upload"), at }],
    tickets: [],
    drafts: [],
  }
  store.set((applications) => [...applications.filter((entry) => !(entry.role === role && entry.userId === userId)), application])
}

/** Sends a started application to review once its documents are in —
 *  that's when its first ticket opens. */
function submitStartedApplication(role: OnboardingRole, userId: string) {
  update(role, userId, (application) => {
    const documents = application.documents.filter((document) => document.versions.length > 0 || document.required)
    const uploaded = documents.filter((document) => document.versions.length > 0)
    const submitted = { ...application, submittedAt: now(), documents }
    if (application.tickets.some((ticket) => ticket.origin === "onboarding")) return submitted
    const ticket = makeTicket(submitted, {
      seq: 1,
      origin: "onboarding",
      title: "Onboarding KYC",
      openedBy: applicantAuthor(application, application.fullName),
      assignee: null,
      items: documents.map((document) =>
        item(document.id, { status: document.versions.length > 0 ? "pending" : "missing", versionId: document.versions.at(-1)?.id ?? null })
      ),
    })
    return {
      ...submitted,
      tickets: [ticket],
      comments: [
        ...application.comments.map((entry) => ({ ...entry, ticketId: entry.ticketId ?? ticket.id })),
        comment(systemAuthor, `Submitted ${uploaded.length} documents for review`, null, ticket.id),
      ],
    }
  })
}

/**
 * Where a new upload for one document goes: into the open ticket that
 * covers it (a KAM's request, a send-back, or a pending update), straight
 * onto the document before the first submission, or otherwise into the
 * applicant's pending changes for a new ticket.
 */
function uploadTarget(application: KycApplication, docId: string): { kind: "ticket"; ticket: KycTicket } | { kind: "direct" } | { kind: "draft" } {
  const ticket = openTicketFor(application, docId)
  if (ticket) return { kind: "ticket", ticket }
  if (!application.submittedAt) return { kind: "direct" }
  return { kind: "draft" }
}

/** A new upload for one document that goes in now — into its open ticket,
 *  or onto the document before the first submission. The earlier upload
 *  stays in the history. */
function uploadDocumentVersion(role: OnboardingRole, userId: string, docId: string, file: UploadedVersion, applicantName: string) {
  update(role, userId, (application) => {
    const document = application.documents.find((entry) => entry.id === docId)
    if (!document) return application
    const ticket = openTicketFor(application, docId)
    const version = newVersion(file)
    const count = document.versions.length + 1
    const next = attachUpload(application, ticket, docId, version)
    return {
      ...next,
      comments: [
        ...next.comments,
        comment(
          applicantAuthor(application, applicantName),
          count === 1 ? `Uploaded ${labelOf(document)}` : `Uploaded a new version of ${labelOf(document)} (v${count})`,
          docId,
          ticket?.id ?? null
        ),
      ],
    }
  })
}

/** Picks a replacement without sending it — it waits in the applicant's
 *  pending changes until "Finalise & submit". A second pick for the same
 *  document replaces the first. */
function stageDocumentUpdate(role: OnboardingRole, userId: string, docId: string, file: UploadedVersion) {
  const replaced = findApplication(role, userId)?.drafts.find((draft) => draft.docId === docId)?.version.fileId
  update(role, userId, (application) => ({
    ...application,
    drafts: [...application.drafts.filter((draft) => draft.docId !== docId), { docId, version: newVersion(file) }],
  }))
  if (replaced) void deleteFiles([replaced])
}

function discardDraftUpdate(role: OnboardingRole, userId: string, docId: string) {
  const fileId = findApplication(role, userId)?.drafts.find((draft) => draft.docId === docId)?.version.fileId
  update(role, userId, (application) => ({ ...application, drafts: application.drafts.filter((draft) => draft.docId !== docId) }))
  if (fileId) void deleteFiles([fileId])
}

/**
 * "Finalise & submit": every pending change goes in. A change for a
 * document already on an open ticket joins that ticket; the rest open one
 * new ticket, handed to the account's KAM. Returns the new ticket's id.
 */
function submitDraftUpdates(role: OnboardingRole, userId: string, applicantName: string, note?: string): string | null {
  const current = findApplication(role, userId)
  if (!current || current.drafts.length === 0) return null
  const fresh = current.drafts.filter((draft) => !openTicketFor(current, draft.docId))
  const newId = fresh.length > 0 ? kycTicketNumber(role, current.email, nextSeq(current)) : null

  update(role, userId, (application) => {
    const author = applicantAuthor(application, applicantName)
    let next: KycApplication = { ...application, drafts: [] }
    const entries: KycComment[] = []
    const freshItems: KycTicketItem[] = []

    for (const draft of application.drafts) {
      const document = next.documents.find((entry) => entry.id === draft.docId)
      if (!document) continue
      const ticket = openTicketFor(next, draft.docId)
      if (ticket) {
        next = attachUpload(next, ticket, draft.docId, draft.version)
        entries.push(comment(author, `Uploaded a new version of ${labelOf(document)}`, draft.docId, ticket.id))
      } else {
        next = attachUpload(next, null, draft.docId, draft.version)
        freshItems.push(item(draft.docId, { versionId: draft.version.id }))
      }
    }

    if (freshItems.length > 0 && newId) {
      const kam = accountKam(application)
      const first = next.documents.find((entry) => entry.id === freshItems[0].docId)
      const ticket = {
        ...makeTicket(next, {
          origin: "applicant",
          title: freshItems.length === 1 && first ? `Updated ${labelOf(first)}` : `Updated ${freshItems.length} documents`,
          openedBy: author,
          assignee: kam,
          items: freshItems,
        }),
        id: newId,
      }
      next = { ...next, tickets: [...next.tickets, ticket] }
      entries.push(comment(systemAuthor, `Raised with ${freshItems.length} updated document${freshItems.length === 1 ? "" : "s"}`, null, ticket.id))
      if (note?.trim()) entries.push(comment(author, note.trim(), null, ticket.id))
      entries.push(comment(systemAuthor, kam ? `Assigned to ${kam.name}` : "Waiting for a KAM to pick it up", null, ticket.id))
    }

    return { ...next, comments: [...next.comments, ...entries] }
  })
  return newId
}

/** A reply from the applicant on one ticket — answering a send-back on
 *  the first ticket puts it back in the reviewer's queue. */
function addApplicantComment(role: OnboardingRole, userId: string, text: string, docId: string | null, applicantName: string, ticketId?: string | null) {
  update(role, userId, (application) => {
    const target = ticketId ?? (application.tickets.length > 0 ? onboardingTicketId(application) : null)
    const onboarding = !target || target === onboardingTicketId(application)
    return {
      ...application,
      reviewerNote: onboarding ? null : application.reviewerNote,
      comments: [...application.comments, comment(applicantAuthor(application, applicantName), text, docId, target)],
    }
  })
}

/* ------------------------------ Reviewer side ---------------------------- */

function addStaffComment(role: OnboardingRole, userId: string, text: string, docId: string | null, by: StaffActor, ticketId?: string | null) {
  update(role, userId, (application) => ({
    ...application,
    comments: [...application.comments, comment(staffAuthor(by), text, docId, ticketId ?? (application.tickets.length > 0 ? onboardingTicketId(application) : null))],
  }))
}

/** A verdict on one document within one ticket — approve it, or send it
 *  back with what to fix. Without a ticket, the open one covering it. */
function setDocumentStatus(
  role: OnboardingRole,
  userId: string,
  docId: string,
  status: "pending" | "approved" | "rejected",
  note: string | null,
  by: StaffActor,
  ticketId?: string | null
) {
  update(role, userId, (application) => {
    const document = application.documents.find((entry) => entry.id === docId)
    if (!document) return application
    const ticket = ticketById(application, ticketId) ?? openTicketFor(application, docId)
    const reviewedBy = status === "pending" ? null : { id: by.id, name: by.name, at: now() }
    const text = note?.trim() || null
    const entries =
      status === "rejected"
        ? [comment(staffAuthor(by), text || `Please upload ${labelOf(document)} again.`, docId, ticket?.id ?? null)]
        : status === "approved"
          ? [comment(systemAuthor, `${by.name} approved ${labelOf(document)}`, docId, ticket?.id ?? null)]
          : []
    let next = patchDocument(application, docId, (entry) => ({
      ...entry,
      reviewStatus: status,
      reviewNote: status === "rejected" ? text : null,
      reviewedBy,
      requestedBy: status === "approved" ? null : entry.requestedBy,
    }))
    if (ticket) {
      next = patchTicket(next, ticket.id, (current) =>
        patchItem(current, docId, (entry) => ({ ...entry, status, note: status === "rejected" ? text : entry.note, reviewedBy }))
      )
    }
    return { ...next, comments: [...next.comments, ...entries] }
  })
}

/** Which ticket a KAM's request lands on: the one they're looking at if
 *  it's still open, otherwise a new one they own. */
function requestTarget(application: KycApplication, ticketId: string | null | undefined, title: string, by: StaffActor) {
  const open = ticketById(application, ticketId)
  if (open && !open.resolvedAt) return { application, ticket: open }
  const ticket = makeTicket(application, {
    origin: "staff",
    title,
    openedBy: staffAuthor(by),
    assignee: { id: by.id, name: by.name },
    items: [],
  })
  return { application: { ...application, tickets: [...application.tickets, ticket] }, ticket }
}

/**
 * Asks for a fresh copy of a document already on file — it expired, or
 * the details on it changed. The old upload stays on record; the document
 * shows on the applicant's page as needing action.
 */
function requestDocumentUpdate(role: OnboardingRole, userId: string, docId: string, note: string, by: StaffActor, ticketId?: string | null) {
  update(role, userId, (application) => {
    const document = application.documents.find((entry) => entry.id === docId)
    if (!document) return application
    const text = note.trim() || `Please upload a current ${labelOf(document)}.`
    const requestedBy = { id: by.id, name: by.name }
    const covering = openTicketFor(application, docId)
    let next: KycApplication
    let target: KycTicket
    if (covering) {
      target = covering
      next = patchTicket(application, covering.id, (ticket) =>
        patchItem(ticket, docId, (entry) => ({ ...entry, status: "update-requested", note: text, requestedBy, reviewedBy: null }))
      )
    } else {
      const placed = requestTarget(application, ticketId, `Update ${labelOf(document)}`, by)
      target = placed.ticket
      next = patchTicket(placed.application, target.id, (ticket) => ({
        ...ticket,
        items: [...ticket.items, item(docId, { kind: "update", status: "update-requested", note: text, requestedBy })],
      }))
    }
    next = patchDocument(next, docId, (entry) => ({
      ...entry,
      reviewStatus: "update-requested",
      reviewNote: text,
      requestedBy: { ...requestedBy, at: now() },
    }))
    return { ...next, comments: [...next.comments, comment(staffAuthor(by), text, docId, target.id)] }
  })
}

/** Asks for a document the account doesn't have — another licence, a
 *  certificate, anything. It shows up on the applicant's page as
 *  something to upload. */
function requestDocument(
  role: OnboardingRole,
  userId: string,
  input: { label: string; hint?: string; note?: string },
  by: StaffActor,
  ticketId?: string | null
) {
  const id = `extra-${localId("doc")}`
  const label = input.label.trim()
  update(role, userId, (application) => {
    // Before approval a request joins the first ticket; after, the one the
    // KAM is looking at, or a new one.
    const onboardingOpen = application.reviewStatus !== "approved" ? application.tickets.find((ticket) => ticket.origin === "onboarding" && !ticket.resolvedAt) : undefined
    const placed = requestTarget(application, ticketId ?? onboardingOpen?.id ?? null, `New document: ${label}`, by)
    const text = input.note?.trim() || `Please upload your ${label}.`
    const requestedBy = { id: by.id, name: by.name }
    const next = patchTicket(placed.application, placed.ticket.id, (ticket) => ({
      ...ticket,
      items: [...ticket.items, item(id, { kind: "new", status: "missing", note: text, requestedBy })],
    }))
    return {
      ...next,
      documents: [
        ...next.documents,
        {
          id,
          label,
          hint: input.hint?.trim() || undefined,
          required: true,
          reviewStatus: "missing",
          reviewNote: input.note?.trim() || null,
          reviewedBy: null,
          requestedBy: { ...requestedBy, at: now() },
          versions: [],
        },
      ],
      comments: [...next.comments, comment(staffAuthor(by), text, id, placed.ticket.id)],
    }
  })
}

/** Withdraws a request the applicant hasn't answered yet: a new document
 *  disappears, an update request goes back to the copy on file. */
function withdrawRequest(role: OnboardingRole, userId: string, docId: string, by: StaffActor) {
  update(role, userId, (application) => {
    const document = application.documents.find((entry) => entry.id === docId)
    if (!document) return application
    const ticket = openTicketFor(application, docId)
    if (document.reviewStatus === "missing" && document.versions.length === 0) {
      return {
        ...application,
        documents: application.documents.filter((entry) => entry.id !== docId),
        tickets: application.tickets.map((entry) => ({ ...entry, items: entry.items.filter((line) => line.docId !== docId) })),
        comments: [...application.comments, comment(systemAuthor, `${by.name} withdrew the request for ${labelOf(document)}`, null, ticket?.id ?? null)],
      }
    }
    if (document.reviewStatus !== "update-requested") return application
    let next = patchDocument(application, docId, (entry) => ({ ...entry, reviewStatus: "approved", reviewNote: null, requestedBy: null }))
    if (ticket) {
      next = patchTicket(next, ticket.id, (current) => {
        const line = current.items.find((entry) => entry.docId === docId)
        if (line?.kind === "update" && !line.versionId) return { ...current, items: current.items.filter((entry) => entry.docId !== docId) }
        return patchItem(current, docId, (entry) => ({ ...entry, status: "pending" }))
      })
    }
    return { ...next, comments: [...next.comments, comment(systemAuthor, `${by.name} withdrew the update request for ${labelOf(document)}`, docId, ticket?.id ?? null)] }
  })
}

/** A whole-application send-back on the first ticket. */
function requestApplicationChanges(role: OnboardingRole, userId: string, note: string, by: StaffActor) {
  update(role, userId, (application) => ({
    ...application,
    reviewerNote: note.trim(),
    reviewedByAdminId: by.id,
    reviewedByName: by.name,
    reviewedAt: now(),
    comments: [...application.comments, comment(staffAuthor(by), note.trim(), null, onboardingTicketId(application))],
  }))
}

/**
 * Approves the application and resolves its first ticket. Only the final
 * upload of each document is kept — every earlier version, and its file,
 * is deleted — and any optional request still unanswered is dropped.
 */
function approveApplication(role: OnboardingRole, userId: string, by: StaffActor) {
  const application = findApplication(role, userId)
  if (!application) return
  const superseded = application.documents.flatMap((document) => document.versions.slice(0, -1).map((version) => version.fileId).filter((id): id is string => !!id))
  const at = now()
  const ticketId = onboardingTicketId(application)
  update(role, userId, (current) => {
    const documents = current.documents
      .filter((document) => document.versions.length > 0)
      .map((document) => ({
        ...document,
        reviewStatus: "approved" as const,
        reviewNote: null,
        reviewedBy: document.reviewedBy?.at && document.reviewStatus === "approved" ? document.reviewedBy : { id: by.id, name: by.name, at },
        versions: document.versions.slice(-1),
      }))
    return {
      ...current,
      reviewStatus: "approved",
      reviewerNote: null,
      reviewedByAdminId: by.id,
      reviewedByName: by.name,
      reviewedAt: at,
      documents,
      tickets: current.tickets.map((ticket) =>
        ticket.id !== ticketId
          ? ticket
          : {
              ...ticket,
              items: ticket.items
                .filter((entry) => documents.some((document) => document.id === entry.docId))
                .map((entry) => {
                  const document = documents.find((candidate) => candidate.id === entry.docId)!
                  return { ...entry, status: "approved" as const, versionId: document.versions[0]?.id ?? null, reviewedBy: entry.reviewedBy ?? document.reviewedBy }
                }),
              resolvedAt: at,
              resolvedBy: { id: by.id, name: by.name },
            }
      ),
      comments: [...current.comments, comment(staffAuthor(by), "Approved — welcome to amama.", null, ticketId)],
    }
  })
  void deleteFiles(superseded)
}

/** Resolves a later ticket: anything still in review is approved with it.
 *  Blocked while the applicant still owes something. */
function resolveKycTicket(role: OnboardingRole, userId: string, ticketId: string, by: StaffActor) {
  update(role, userId, (application) => {
    const ticket = ticketById(application, ticketId)
    if (!ticket || ticket.resolvedAt || ticket.origin === "onboarding") return application
    if (ticket.items.some((entry) => entry.status === "missing" || entry.status === "rejected" || entry.status === "update-requested")) return application
    const at = now()
    let next = application
    for (const entry of ticket.items) {
      if (entry.status === "approved") continue
      next = patchDocument(next, entry.docId, (document) => ({ ...document, reviewStatus: "approved", reviewNote: null, requestedBy: null, reviewedBy: { id: by.id, name: by.name, at } }))
    }
    next = patchTicket(next, ticketId, (current) => ({
      ...current,
      items: current.items.map((entry) => (entry.status === "approved" ? entry : { ...entry, status: "approved", reviewedBy: { id: by.id, name: by.name, at } })),
      resolvedAt: at,
      resolvedBy: { id: by.id, name: by.name },
    }))
    return { ...next, comments: [...next.comments, comment(staffAuthor(by), "Approved and resolved.", null, ticketId)] }
  })
}

/** The account's owner — also the owner of its first ticket. */
function assignTicket(role: OnboardingRole, userId: string, assignee: StaffActor | null, by: StaffActor) {
  const application = findApplication(role, userId)
  if (!application) return
  assignKycTicket(role, userId, onboardingTicketId(application), assignee, by)
}

/** Who works one ticket. On the first ticket it also sets the account's
 *  KAM, who later tickets the applicant raises are handed to. */
function assignKycTicket(role: OnboardingRole, userId: string, ticketId: string, assignee: StaffActor | null, by: StaffActor) {
  update(role, userId, (application) => {
    const onboarding = ticketId === onboardingTicketId(application)
    const text = assignee ? (assignee.id === by.id ? `${by.name} took this ticket` : `${by.name} assigned this ticket to ${assignee.name}`) : `${by.name} unassigned this ticket`
    const next = patchTicket(application, ticketId, (ticket) => ({ ...ticket, assignee: assignee ? { id: assignee.id, name: assignee.name } : null }))
    return {
      ...next,
      assigneeId: onboarding ? (assignee?.id ?? null) : (application.assigneeId ?? assignee?.id ?? null),
      comments: [...next.comments, comment(systemAuthor, text, null, ticketId)],
    }
  })
}

/* --------------------------------- Reads --------------------------------- */

function useKycApplications(): KycApplication[] {
  const raw = store.use()
  return React.useMemo(() => raw.map(withTickets), [raw])
}

const useKycLoaded = store.useLoaded

export {
  submitApplication,
  startApplication,
  submitStartedApplication,
  uploadTarget,
  uploadDocumentVersion,
  stageDocumentUpdate,
  discardDraftUpdate,
  submitDraftUpdates,
  addApplicantComment,
  addStaffComment,
  setDocumentStatus,
  requestDocumentUpdate,
  requestDocument,
  withdrawRequest,
  requestApplicationChanges,
  approveApplication,
  resolveKycTicket,
  assignTicket,
  assignKycTicket,
  useKycApplications,
  useKycLoaded,
  findApplication,
  labelOf,
  ticketComments,
  openTicketFor,
  onboardingTicketId,
}
