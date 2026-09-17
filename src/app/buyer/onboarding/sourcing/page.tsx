"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useI18n } from "@/features/i18n/i18n-context"
import { StepShell } from "@/features/onboarding/components/step-shell"
import {
  SelectableTile,
  SelectableTileGroup,
} from "@/features/onboarding/components/selectable"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import {
  cropImageUrl,
  crops,
  effectiveSteps,
  nextStep,
  previousStep,
  stepIndex,
} from "@/features/onboarding/steps"

export default function BuyerSourcingPage() {
  const router = useRouter()
  const { t } = useI18n()
  const { draft, updateBuyer } = useOnboarding()
  const picked = draft.buyer.sourcing
  const entityType = draft.buyer.entityType

  const toggle = (id: string) =>
    updateBuyer((prev) => ({
      sourcing: prev.sourcing.includes(id)
        ? prev.sourcing.filter((crop) => crop !== id)
        : [...prev.sourcing, id],
    }))

  // Reached from the Profile page's "Edit product list" link, rather than
  // walking the wizard in order — every pick already saves immediately (see
  // `toggle` above), so there's nothing left to "continue" into. Both the
  // back arrow and the primary button return straight to Profile instead of
  // the next/previous onboarding step.
  const fromProfile = useSearchParams().get("from") === "profile"
  const profileHref = "/buyer/dashboard/profile"

  const target = nextStep("buyer", "sourcing", entityType)
  const back = previousStep("buyer", "sourcing", entityType)
  const continueHref = fromProfile ? profileHref : target?.href

  return (
    <StepShell
      step={stepIndex("buyer", "sourcing", entityType) + 1}
      totalSteps={effectiveSteps("buyer", entityType).length}
      backHref={fromProfile ? profileHref : back?.href ?? "/"}
      title={t("onboarding.sourcing.title")}
      description={t("onboarding.sourcing.description")}
      skipHref={continueHref}
      footer={
        <Button
          size="xl"
          className="w-full"
          onClick={() => continueHref && router.push(continueHref)}
        >
          {picked.length > 0
            ? t("common.continueWithCount", { count: picked.length })
            : t("common.continue")}
          <ArrowRightIcon />
        </Button>
      }
    >
      <p aria-live="polite" className="sr-only">
        {t("onboarding.sourcing.selectedAnnouncement", { count: picked.length })}
      </p>
      <SelectableTileGroup
        aria-label={t("onboarding.sourcing.title")}
        className="grid grid-cols-2 gap-3 sm:grid-cols-3"
      >
        {crops.map((crop) => {
          const label = t(`onboarding.options.crops.${crop.id}`)
          return (
            <SelectableTile
              key={crop.id}
              label={label}
              photo={{ src: cropImageUrl(crop.photo), alt: label }}
              selected={picked.includes(crop.id)}
              onToggle={() => toggle(crop.id)}
            />
          )
        })}
      </SelectableTileGroup>
    </StepShell>
  )
}
