"use client"

import * as React from "react"
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

// `useSearchParams` (for the "Edit product list" deep link) opts this route
// out of static rendering unless it sits under a boundary.
export default function BuyerSourcingPage() {
  return (
    <React.Suspense fallback={null}>
      <BuyerSourcingPageInner />
    </React.Suspense>
  )
}

function BuyerSourcingPageInner() {
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

  // Reached from the Profile page's "Edit product list" link, or the
  // marketplace's "Edit buying interests" popover, rather than walking the
  // wizard in order — every pick already saves immediately (see `toggle`
  // above), so there's nothing left to "continue" into. Both the back arrow
  // and the primary button return straight to wherever the buyer came from
  // instead of the next/previous onboarding step.
  const from = useSearchParams().get("from")
  const returnHref =
    from === "profile"
      ? "/buyer/dashboard/profile"
      : from === "marketplace"
        ? "/buyer/dashboard/sourcing"
        : null

  const target = nextStep("buyer", "sourcing", entityType)
  const back = previousStep("buyer", "sourcing", entityType)
  const continueHref = returnHref ?? target?.href

  return (
    <StepShell
      step={stepIndex("buyer", "sourcing", entityType) + 1}
      totalSteps={effectiveSteps("buyer", entityType).length}
      backHref={returnHref ?? back?.href ?? "/"}
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
