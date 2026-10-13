"use client"

import { deleteFiles } from "@/features/local-db/file-store"
import { createPersistentStore, localId } from "@/features/local-db/persistent-store"
import type { OnboardingRole } from "@/features/onboarding/types"
import { documentLabel, seedKycApplications } from "@/features/verification/kyc-seed"
import type { KycApplication, KycAuthor, KycComment, KycDocument, ReviewStatus } from "@/features/verification/kyc-types"

/**
 * Every KYC application, both sides of every ticket: the applicant's
 * documents with each upload kept, the reviewer's verdicts, and the
 * conversation between them. Lives in localStorage; the files themselves
 * are in IndexedDB.
 */
const store = createPersistentStore<KycApplication[]>("amama.kyc.applications", seedKycApplications, [])

export type StaffActor = { id: string; name: string; title?: string }
export type UploadedVersion = { name: string; size: number; fileId: string | null }

const now = () => new Date().toISOString()

const staffAuthor = (by: StaffActor): KycAuthor => ({ kind: "staff", id: by.id, name: by.name, title: by.title })
const systemAuthor: KycAuthor = { kind: "system", id: "system", name: "amama" }

const comment = (author: KycAuthor, text: string, docId: string | null = null): KycComment => ({
  id: localId("c"),
  author,
  text,
  at: now(),
  docId,
})

/** A document's display name for timeline entries — its own label for
 *  one a KAM asked for, the catalog's otherwise. */
const labelOf = (document: KycDocument) => document.label ?? documentLabel(document.id)

/** Where the ticket stands, from what's on it: approved stays approved;
 *  anything the applicant still owes — a rejected or missing document,
 *  or an unanswered send-back — means it's waiting on them. */
function deriveStatus(application: KycApplication): ReviewStatus {
  if (application.reviewStatus === "approved") return "approved"
  if (!application.submittedAt) return "not-submitted"
  const owes =
    application.reviewerNote !== null ||
    application.documents.some((document) => document.reviewStatus === "rejected" || (document.required && document.reviewStatus === "missing"))
  return owes ? "changes-requested" : "pending"
}

function update(role: OnboardingRole, userId: string, change: (application: KycApplication) => KycApplication) {
  store.set((applications) =>
    applications.map((application) => {
      if (application.role !== role || application.userId !== userId) return application
      const next = change(application)
      return { ...next, reviewStatus: deriveStatus(next) }
    })
  )
}

const findApplication = (role: OnboardingRole, userId: string) =>
  store.get().find((application) => application.role === role && application.userId === userId) ?? null

/* ----------------------------- Applicant side ---------------------------- */

type SubmitInput = {
  role: OnboardingRole
  applicant: Pick<KycApplication, "email" | "fullName" | "companyName" | "entityType" | "sellerSubType" | "country">
  documents: { id: string; required: boolean; file: UploadedVersion }[]
}

/** The first submission — or a fresh one, replacing a draft that never
 *  went in. */
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
    versions: [{ id: localId("v"), ...file, uploadedAt: at }],
  }))
  const application: KycApplication = {
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
    comments: [{ ...comment(systemAuthor, `Submitted ${kycDocuments.length} documents for review`), at }],
  }
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
      versions: file ? [{ id: localId("v"), ...file, uploadedAt: at }] : [],
    })),
    comments: [{ ...comment(systemAuthor, "Started KYC — documents still to upload"), at }],
  }
  store.set((applications) => [...applications.filter((entry) => !(entry.role === role && entry.userId === userId)), application])
}

/** Sends a started application to review once its documents are in. */
function submitStartedApplication(role: OnboardingRole, userId: string) {
  update(role, userId, (application) => {
    const uploaded = application.documents.filter((document) => document.versions.length > 0)
    return {
      ...application,
      submittedAt: now(),
      documents: application.documents.filter((document) => document.versions.length > 0 || document.required),
      comments: [...application.comments, comment(systemAuthor, `Submitted ${uploaded.length} documents for review`)],
    }
  })
}

/** A new upload for one document — a replacement for one sent back, or a
 *  document a KAM asked for. The earlier upload stays in the history. */
function uploadDocumentVersion(role: OnboardingRole, userId: string, docId: string, file: UploadedVersion, applicantName: string) {
  update(role, userId, (application) => {
    const document = application.documents.find((entry) => entry.id === docId)
    if (!document) return application
    const version = document.versions.length + 1
    return {
      ...application,
      reviewerNote: null,
      documents: application.documents.map((entry) =>
        entry.id === docId
          ? {
              ...entry,
              reviewStatus: "pending",
              reviewNote: null,
              reviewedBy: null,
              versions: [...entry.versions, { id: localId("v"), ...file, uploadedAt: now() }],
            }
          : entry
      ),
      comments: [
        ...application.comments,
        comment(
          { kind: "applicant", id: userId, name: applicantName },
          version === 1 ? `Uploaded ${labelOf(document)}` : `Uploaded a new version of ${labelOf(document)} (v${version})`,
          docId
        ),
      ],
    }
  })
}

/** A reply from the applicant — answering a send-back puts the ticket
 *  back in the reviewer's queue. */
function addApplicantComment(role: OnboardingRole, userId: string, text: string, docId: string | null, applicantName: string) {
  update(role, userId, (application) => ({
    ...application,
    reviewerNote: null,
    comments: [...application.comments, comment({ kind: "applicant", id: userId, name: applicantName }, text, docId)],
  }))
}

/* ------------------------------ Reviewer side ---------------------------- */

function addStaffComment(role: OnboardingRole, userId: string, text: string, docId: string | null, by: StaffActor) {
  update(role, userId, (application) => ({ ...application, comments: [...application.comments, comment(staffAuthor(by), text, docId)] }))
}

function setDocumentStatus(
  role: OnboardingRole,
  userId: string,
  docId: string,
  status: "pending" | "approved" | "rejected",
  note: string | null,
  by: StaffActor
) {
  update(role, userId, (application) => {
    const document = application.documents.find((entry) => entry.id === docId)
    if (!document) return application
    const entries =
      status === "rejected"
        ? [comment(staffAuthor(by), note?.trim() || `Please upload ${labelOf(document)} again.`, docId)]
        : status === "approved"
          ? [comment(systemAuthor, `${by.name} approved ${labelOf(document)}`, docId)]
          : []
    return {
      ...application,
      documents: application.documents.map((entry) =>
        entry.id === docId
          ? {
              ...entry,
              reviewStatus: status,
              reviewNote: status === "rejected" ? note?.trim() || null : null,
              reviewedBy: status === "pending" ? null : { id: by.id, name: by.name, at: now() },
            }
          : entry
      ),
      comments: [...application.comments, ...entries],
    }
  })
}

/** Asks for a document the standard list didn't include — another
 *  licence, a certificate, anything. It shows up on the applicant's
 *  ticket as something to upload. */
function requestDocument(role: OnboardingRole, userId: string, input: { label: string; hint?: string; note?: string }, by: StaffActor) {
  const id = `extra-${localId("doc")}`
  update(role, userId, (application) => ({
    ...application,
    documents: [
      ...application.documents,
      {
        id,
        label: input.label.trim(),
        hint: input.hint?.trim() || undefined,
        required: true,
        reviewStatus: "missing",
        reviewNote: null,
        reviewedBy: null,
        requestedBy: { id: by.id, name: by.name, at: now() },
        versions: [],
      },
    ],
    comments: [...application.comments, comment(staffAuthor(by), input.note?.trim() || `Please upload your ${input.label.trim()}.`, id)],
  }))
}

/** Withdraws a requested document that hasn't been uploaded yet. */
function withdrawRequest(role: OnboardingRole, userId: string, docId: string, by: StaffActor) {
  update(role, userId, (application) => {
    const document = application.documents.find((entry) => entry.id === docId)
    if (!document || document.versions.length > 0) return application
    return {
      ...application,
      documents: application.documents.filter((entry) => entry.id !== docId),
      comments: [...application.comments, comment(systemAuthor, `${by.name} withdrew the request for ${labelOf(document)}`)],
    }
  })
}

function requestApplicationChanges(role: OnboardingRole, userId: string, note: string, by: StaffActor) {
  update(role, userId, (application) => ({
    ...application,
    reviewerNote: note.trim(),
    reviewedByAdminId: by.id,
    reviewedByName: by.name,
    reviewedAt: now(),
    comments: [...application.comments, comment(staffAuthor(by), note.trim())],
  }))
}

/**
 * Approves the application. Only the final upload of each document is
 * kept — every earlier version, and its file, is deleted — and any
 * optional request still unanswered is dropped.
 */
function approveApplication(role: OnboardingRole, userId: string, by: StaffActor) {
  const application = findApplication(role, userId)
  if (!application) return
  const superseded = application.documents.flatMap((document) => document.versions.slice(0, -1).map((version) => version.fileId).filter((id): id is string => !!id))
  const at = now()
  update(role, userId, (current) => ({
    ...current,
    reviewStatus: "approved",
    reviewerNote: null,
    reviewedByAdminId: by.id,
    reviewedByName: by.name,
    reviewedAt: at,
    documents: current.documents
      .filter((document) => document.versions.length > 0)
      .map((document) => ({
        ...document,
        reviewStatus: "approved",
        reviewNote: null,
        reviewedBy: document.reviewedBy?.at && document.reviewStatus === "approved" ? document.reviewedBy : { id: by.id, name: by.name, at },
        versions: document.versions.slice(-1),
      })),
    comments: [...current.comments, comment(staffAuthor(by), "Approved — welcome to amama.")],
  }))
  void deleteFiles(superseded)
}

function assignTicket(role: OnboardingRole, userId: string, assignee: StaffActor | null, by: StaffActor) {
  update(role, userId, (application) => ({
    ...application,
    assigneeId: assignee?.id ?? null,
    comments: [
      ...application.comments,
      comment(systemAuthor, assignee ? (assignee.id === by.id ? `${by.name} took this ticket` : `${by.name} assigned this ticket to ${assignee.name}`) : `${by.name} unassigned this ticket`),
    ],
  }))
}

/* --------------------------------- Reads --------------------------------- */

function useKycApplications(): KycApplication[] {
  return store.use()
}

const useKycLoaded = store.useLoaded

export {
  submitApplication,
  startApplication,
  submitStartedApplication,
  uploadDocumentVersion,
  addApplicantComment,
  addStaffComment,
  setDocumentStatus,
  requestDocument,
  withdrawRequest,
  requestApplicationChanges,
  approveApplication,
  assignTicket,
  useKycApplications,
  useKycLoaded,
  findApplication,
  labelOf,
}
