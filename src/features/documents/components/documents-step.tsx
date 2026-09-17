"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRightIcon,
  Camera,
  CreditCard,
  FileStack,
  Fingerprint,
  IdCard,
  Landmark,
  MapPinned,
  PackageSearch,
  Receipt,
  ScrollText,
  ShieldCheck,
  Ship,
  Users,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DocumentUploadCard,
  type UploadedFile,
} from "@/features/documents/components/document-upload-card"
import { useDocumentDraft } from "@/features/documents/document-draft-store"
import {
  documentCatalog,
  getRequiredDocuments,
  type DocumentId,
} from "@/features/documents/documents"
import { useI18n } from "@/features/i18n/i18n-context"
import { StepShell } from "@/features/onboarding/components/step-shell"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import {
  effectiveSteps,
  nextStep,
  previousStep,
  stepIndex,
} from "@/features/onboarding/steps"
import type { OnboardingRole } from "@/features/onboarding/types"
import { useVerification } from "@/features/verification/verification-context"

const icons: Record<string, LucideIcon> = {
  IdCard,
  Fingerprint,
  CreditCard,
  Receipt,
  ScrollText,
  FileStack,
  Ship,
  MapPinned,
  Camera,
  Users,
  ShieldCheck,
  PackageSearch,
  Landmark,
}

const iconNameById = Object.fromEntries(
  documentCatalog.map((entry) => [entry.id, entry.icon])
)

/**
 * The last gate before review. Which documents appear at all comes entirely
 * from `getRequiredDocuments` — the one place that knows what country +
 * entity type + seller sub-type implies. What happens on "Continue" is a
 * submission to a Key Account Manager, not an entry into the product:
 * there's deliberately no Skip here, because skipping KYC just moves the
 * rejection later.
 *
 * Uploads themselves are simulated (see `DocumentUploadCard`); what's
 * recorded for the reviewer is the file metadata, which is all that would
 * survive the tab anyway without a real upload endpoint behind it.
 *
 * Two different returns land here, and each changes what this form asks
 * for:
 *  - First-time onboarding, no submission yet: every document `documents`
 *    resolves to is asked for, seeded from whatever was already saved to
 *    this browser's document draft (`useDocumentDraft`) so leaving mid-form
 *    and coming back — even in a new session — resumes instead of starting
 *    over.
 *  - A KAM sent one or more specific documents back (any `reviewStatus:
 *    "rejected"` on the existing submission): only *those* documents are
 *    shown. Everything already approved or still awaiting review stays as
 *    it was — the applicant re-uploads exactly what was flagged, not the
 *    whole application.
 */
function DocumentsStep({ role }: { role: OnboardingRole }) {
  const router = useRouter()
  const { t } = useI18n()
  const { draft } = useOnboarding()
  const { submissions, submit, resubmitDocuments } = useVerification()
  const current = role === "buyer" ? draft.buyer : draft.seller

  const submission = submissions[role]
  const rejectedIds = React.useMemo(
    () =>
      new Set(
        submission?.documents
          .filter((document) => document.reviewStatus === "rejected")
          .map((document) => document.id) ?? []
      ),
    [submission]
  )
  const isResubmission = !!submission && rejectedIds.size > 0

  const { uploads: draftUploads, setUpload: setDraftUpload, clear: clearDraft } = useDocumentDraft(role)

  // Only relevant in resubmission mode — what the applicant has picked in
  // this visit for a flagged document, layered on top of `resubmitBase`
  // below. There's no equivalent draft store for this path: a resubmission
  // is one specific, usually short, follow-up rather than a form worth
  // resuming across sessions.
  const [resubmitChanges, setResubmitChanges] = React.useState<Record<string, UploadedFile | null>>({})

  const resubmitBase = React.useMemo(() => {
    if (!submission) return {}
    return Object.fromEntries(
      submission.documents
        .filter((document) => !rejectedIds.has(document.id))
        .map((document) => [
          document.id,
          { name: document.name, size: document.size, dataUrl: document.dataUrl ?? undefined },
        ])
    )
  }, [submission, rejectedIds])

  const resubmitUploads = React.useMemo(() => {
    const merged: Record<string, UploadedFile> = { ...resubmitBase }
    for (const [id, file] of Object.entries(resubmitChanges)) {
      if (file) merged[id] = file
      else delete merged[id]
    }
    return merged
  }, [resubmitBase, resubmitChanges])

  const uploads = isResubmission ? resubmitUploads : draftUploads

  const target = nextStep(role, "documents", current.entityType)
  const back = previousStep(role, "documents", current.entityType)

  const documents = getRequiredDocuments({
    country: current.country,
    role,
    entityType: current.entityType,
    sellerSubType: role === "seller" ? draft.seller.sellerSubType : undefined,
  })

  const visibleDocuments = isResubmission
    ? documents.filter((entry) => rejectedIds.has(entry.id))
    : documents

  const requiredIds = visibleDocuments.filter((entry) => entry.required).map((entry) => entry.id)
  const doneCount = requiredIds.filter((id) => uploads[id]).length
  const canContinue = doneCount === requiredIds.length

  const handleChange = React.useCallback(
    (id: DocumentId, file: UploadedFile | null) => {
      if (isResubmission) {
        setResubmitChanges((previous) => ({ ...previous, [id]: file }))
        return
      }
      setDraftUpload(id, file)
    },
    [isResubmission, setDraftUpload]
  )

  const handleContinue = () => {
    if (!canContinue || !target) return

    if (isResubmission) {
      resubmitDocuments(
        role,
        visibleDocuments
          .filter((entry) => uploads[entry.id])
          .map((entry) => ({
            id: entry.id,
            name: uploads[entry.id].name,
            size: uploads[entry.id].size,
            required: entry.required,
            reviewStatus: "pending" as const,
            reviewNote: null,
            dataUrl: uploads[entry.id].dataUrl ?? null,
          }))
      )
      router.push(target.href)
      return
    }

    submit(
      role,
      {
        fullName: current.fullName,
        email: current.email,
        country: current.country,
        entityType: current.entityType,
        sellerSubType: role === "seller" ? draft.seller.sellerSubType : undefined,
      },
      documents
        .filter((entry) => uploads[entry.id])
        .map((entry) => ({
          id: entry.id,
          name: uploads[entry.id].name,
          size: uploads[entry.id].size,
          required: entry.required,
          reviewStatus: "pending" as const,
          reviewNote: null,
          dataUrl: uploads[entry.id].dataUrl ?? null,
        }))
    )
    clearDraft()
    router.push(target.href)
  }

  return (
    <StepShell
      step={stepIndex(role, "documents", current.entityType) + 1}
      totalSteps={effectiveSteps(role, current.entityType).length}
      backHref={back?.href ?? "/"}
      title={t("onboarding.documents.title")}
      description={t("onboarding.documents.description")}
      footer={
        <Button
          size="xl"
          className="w-full"
          disabled={!canContinue}
          onClick={handleContinue}
        >
          {t("common.continue")}
          <ArrowRightIcon />
        </Button>
      }
      footerNote={
        requiredIds.length > 0 ? (
          <p className="text-[12px] text-muted-foreground" aria-live="polite">
            {t("onboarding.documents.requiredProgress", {
              done: doneCount,
              total: requiredIds.length,
            })}
          </p>
        ) : null
      }
    >
      <div className="flex flex-col gap-3">
        {isResubmission ? (
          <div className="rounded-2xl border border-status-warning/30 bg-status-warning/5 p-4">
            <p className="text-[14px] font-semibold text-foreground">
              {t("review.changesTitle")}
            </p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {(submission?.documents ?? [])
                .filter((document) => rejectedIds.has(document.id))
                .map((document) => (
                  <li key={document.id} className="text-[13px] leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {t(`onboarding.options.documents.${document.id}.label`)}
                    </span>
                    {document.reviewNote ? <> — {document.reviewNote}</> : null}
                  </li>
                ))}
            </ul>
          </div>
        ) : null}

        {visibleDocuments.map(({ id, required }) => (
          <DocumentUploadCard
            key={id}
            documentId={id}
            label={t(`onboarding.options.documents.${id}.label`)}
            hint={t(`onboarding.options.documents.${id}.hint`)}
            required={required}
            icon={icons[iconNameById[id]] ?? IdCard}
            initialFile={uploads[id] ?? null}
            onChange={(file) => handleChange(id, file)}
          />
        ))}
      </div>
    </StepShell>
  )
}

export { DocumentsStep }
