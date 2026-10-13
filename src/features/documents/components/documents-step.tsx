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
  BadgeCheck,
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
  documentText,
  getRequiredDocuments,
  type DocumentId,
} from "@/features/documents/documents"
import { useI18n } from "@/features/i18n/i18n-context"
import { StepShell } from "@/features/onboarding/components/step-shell"
import { useSession, useSessionLoaded } from "@/features/auth/local-auth"
import { putFile } from "@/features/local-db/file-store"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import { saveProfile } from "@/features/onboarding/profile-store"
import { effectiveSteps, previousStep, stepIndex } from "@/features/onboarding/steps"
import type { OnboardingRole } from "@/features/onboarding/types"
import { startApplication, submitApplication } from "@/features/verification/kyc-store"
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
  BadgeCheck,
}

const iconNameById = Object.fromEntries(
  documentCatalog.map((entry) => [entry.id, entry.icon])
)

/**
 * The last onboarding step. Which documents appear comes entirely from
 * `getRequiredDocuments` — the one place that knows what country, entity
 * type and seller sub-type imply. Submitting creates the KYC ticket and
 * lands the applicant in their dashboard, locked to that ticket until a
 * KAM approves it. Skip starts the application without submitting it:
 * the dashboard opens locked to Verification and Support, where the
 * documents can be uploaded later.
 *
 * Files go to IndexedDB as they're picked (see `DocumentUploadCard`), and
 * the picks are saved to this browser's document draft, so leaving mid-form
 * and coming back resumes instead of starting over. Anything after the
 * first submission — a replacement, a document a KAM asked for — happens
 * on the ticket itself, not here.
 */
function DocumentsStep({ role }: { role: OnboardingRole }) {
  const router = useRouter()
  const { t } = useI18n()
  const { draft } = useOnboarding()
  const session = useSession()
  const sessionLoaded = useSessionLoaded()
  const { applicationFor } = useVerification()
  const current = role === "buyer" ? draft.buyer : draft.seller
  const submitted = applicationFor(role) !== null
  const [submitting, setSubmitting] = React.useState(false)

  // Already submitted: the ticket is where documents change now.
  React.useEffect(() => {
    if (submitted && !submitting) router.replace(`/${role}/dashboard/verification`)
  }, [submitted, submitting, role, router])

  // Documents belong to an account — without one, make it first.
  React.useEffect(() => {
    if (sessionLoaded && (!session || session.kind !== role)) router.replace(`/${role}/onboarding/account`)
  }, [sessionLoaded, session, role, router])

  const { uploads, setUpload, clear: clearDraft } = useDocumentDraft(role)
  const back = previousStep(role, "documents", current.entityType)

  const documents = getRequiredDocuments({
    country: current.country,
    role,
    entityType: current.entityType,
    sellerSubType: role === "seller" ? draft.seller.sellerSubType : undefined,
    certifications: role === "seller" ? draft.seller.certifications : undefined,
  })

  const requiredIds = documents.filter((entry) => entry.required).map((entry) => entry.id)
  const doneCount = requiredIds.filter((id) => uploads[id]).length
  const canContinue = doneCount === requiredIds.length && !submitting

  const handleChange = React.useCallback((id: DocumentId, file: UploadedFile | null) => setUpload(id, file), [setUpload])

  /** What's been picked so far, with any pre-IndexedDB data URL drafts
   *  stored as real files now so the reviewer can open them. */
  const collectUploads = () =>
    Promise.all(
      documents.map(async (entry) => {
        const upload = uploads[entry.id]
        if (!upload) return { id: entry.id, required: entry.required, file: null }
        let fileId = upload.fileId ?? null
        if (!fileId && upload.dataUrl) fileId = await putFile(await (await fetch(upload.dataUrl)).blob())
        return { id: entry.id, required: entry.required, file: { name: upload.name, size: upload.size, fileId } }
      })
    )

  const applicant = () => ({
    email: session!.accountId,
    fullName: current.fullName,
    companyName: role === "buyer" ? draft.buyer.companyName : draft.seller.farmName,
    entityType: current.entityType,
    sellerSubType: role === "seller" ? draft.seller.sellerSubType : undefined,
    country: current.country,
  })

  const handleSubmit = async () => {
    if (!canContinue || !session) return
    setSubmitting(true)
    const picked = (await collectUploads()).filter((entry) => entry.file !== null) as {
      id: string
      required: boolean
      file: { name: string; size: number; fileId: string | null }
    }[]
    saveProfile(role, current)
    submitApplication({ role, applicant: applicant(), documents: picked })
    clearDraft()
    router.push(`/${role}/dashboard`)
  }

  /** Skipping still opens the dashboard — locked to KYC and support until
   *  the documents are uploaded from the Verification page and approved. */
  const handleSkip = async () => {
    if (!session || submitting) return
    setSubmitting(true)
    saveProfile(role, current)
    startApplication({ role, applicant: applicant(), documents: await collectUploads() })
    clearDraft()
    router.push(`/${role}/dashboard/verification`)
  }

  return (
    <StepShell
      step={stepIndex(role, "documents", current.entityType) + 1}
      totalSteps={effectiveSteps(role, current.entityType).length}
      backHref={back?.href ?? "/"}
      title={t("onboarding.documents.title")}
      description={t("onboarding.documents.description")}
      onSkip={() => void handleSkip()}
      footer={
        <Button size="xl" className="w-full" disabled={!canContinue} onClick={() => void handleSubmit()}>
          Submit for review
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
        {documents.map(({ id, required }) => (
          <DocumentUploadCard
            key={id}
            documentId={id}
            label={documentText(id, t).label}
            hint={documentText(id, t).hint}
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
