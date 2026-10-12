"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useI18n } from "@/features/i18n/i18n-context"
import { productLabel } from "@/features/marketplace/catalog"
import { IncotermInfoButton } from "@/features/marketplace/incoterm-picker"
import { InterestPicker } from "@/features/onboarding/components/interest-picker"
import { ChoiceChips } from "@/features/onboarding/components/selectable"
import { StepShell } from "@/features/onboarding/components/step-shell"
import { pickedKeys } from "@/features/onboarding/interests"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import {
  ORDER_SIZE_LABELS,
  effectiveSteps,
  incoterms,
  isCatalogCrop,
  nextStep,
  orderSizes,
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

/**
 * What the buyer buys and how: one search for categories, products,
 * varieties and grades, then a usual order size and incoterm. Nothing is
 * ranked and nothing is required — it only decides what the marketplace
 * shows first.
 */
function BuyerSourcingPageInner() {
  const router = useRouter()
  const { t } = useI18n()
  const { draft, updateBuyer } = useOnboarding()
  const buyer = draft.buyer
  const picked = pickedKeys(buyer).length

  const nameOf = React.useCallback(
    (cropId: string) => (isCatalogCrop(cropId) ? t(`onboarding.options.crops.${cropId}`) : productLabel(cropId)),
    [t]
  )

  // Reached from the Profile page or the marketplace rather than walking
  // the wizard in order — every pick already saves immediately, so both
  // the back arrow and the primary button return to wherever the buyer
  // came from instead of the next/previous onboarding step.
  const from = useSearchParams().get("from")
  const returnHref = from === "profile" ? "/buyer/dashboard/profile" : from === "marketplace" ? "/buyer/dashboard/sourcing" : null

  const target = nextStep("buyer", "sourcing", buyer.entityType)
  const back = previousStep("buyer", "sourcing", buyer.entityType)
  const continueHref = returnHref ?? target?.href

  return (
    <StepShell
      step={stepIndex("buyer", "sourcing", buyer.entityType) + 1}
      totalSteps={effectiveSteps("buyer", buyer.entityType).length}
      backHref={returnHref ?? back?.href ?? "/"}
      title="What do you buy?"
      description="Search a category, product, variety or grade, and pick as many as you like."
      skipHref={continueHref}
      footer={
        <Button size="xl" className="w-full" onClick={() => continueHref && router.push(continueHref)}>
          {picked > 0 ? t("common.continueWithCount", { count: picked }) : t("common.continue")}
          <ArrowRightIcon />
        </Button>
      }
    >
      <InterestPicker buyer={buyer} onChange={updateBuyer} nameOf={nameOf} />

      <fieldset className="mt-8">
        <legend className="text-[14px] font-semibold">Usual order size</legend>
        <ChoiceChips
          label="Usual order size"
          className="mt-2.5 sm:grid-cols-4"
          clearable
          value={buyer.preferences.orderSize}
          options={orderSizes.map((size) => ({ value: size, label: ORDER_SIZE_LABELS[size] }))}
          onChange={(orderSize) => updateBuyer((previous) => ({ preferences: { ...previous.preferences, orderSize } }))}
        />
      </fieldset>

      <fieldset className="mt-6">
        <legend className="flex items-center gap-1.5 text-[14px] font-semibold">
          {t("onboarding.volume.incotermLegend")}
          <IncotermInfoButton />
        </legend>
        <ChoiceChips
          label={t("onboarding.volume.incotermLegend")}
          className="mt-2.5 sm:grid-cols-3"
          clearable
          value={buyer.incoterm}
          options={incoterms.map((term) => ({ value: term, label: t(`onboarding.options.incoterms.${term}`) }))}
          onChange={(incoterm) => updateBuyer({ incoterm })}
        />
      </fieldset>
    </StepShell>
  )
}
