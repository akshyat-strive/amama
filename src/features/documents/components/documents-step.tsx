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
 */
function DocumentsStep({ role }: { role: OnboardingRole }) {
  const router = useRouter()
  const { t } = useI18n()
  const { draft } = useOnboarding()
  const { submit } = useVerification()
  const current = role === "buyer" ? draft.buyer : draft.seller

  const [uploads, setUploads] = React.useState<Record<string, UploadedFile>>({})

  const target = nextStep(role, "documents", current.entityType)
  const back = previousStep(role, "documents", current.entityType)

  const documents = getRequiredDocuments({
    country: current.country,
    role,
    entityType: current.entityType,
    sellerSubType: role === "seller" ? draft.seller.sellerSubType : undefined,
  })

  const requiredIds = documents.filter((entry) => entry.required).map((entry) => entry.id)
  const doneCount = requiredIds.filter((id) => uploads[id]).length
  const canContinue = doneCount === requiredIds.length

  const handleChange = React.useCallback((id: DocumentId, file: UploadedFile | null) => {
    setUploads((previous) => {
      if (!file) {
        if (!previous[id]) return previous
        const next = { ...previous }
        delete next[id]
        return next
      }
      return { ...previous, [id]: file }
    })
  }, [])

  const handleContinue = () => {
    if (!canContinue || !target) return
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
        }))
    )
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
        {documents.map(({ id, required }) => (
          <DocumentUploadCard
            key={id}
            documentId={id}
            label={t(`onboarding.options.documents.${id}.label`)}
            hint={t(`onboarding.options.documents.${id}.hint`)}
            required={required}
            icon={icons[iconNameById[id]] ?? IdCard}
            onChange={(file) => handleChange(id, file)}
          />
        ))}
      </div>
    </StepShell>
  )
}

export { DocumentsStep }
