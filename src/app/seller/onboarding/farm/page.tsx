"use client"

import { useRouter } from "next/navigation"
import { ArrowRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  FieldGroup,
  FieldGroupRow,
  FieldGroupInput,
} from "@/components/ui/field-group"
import { useI18n } from "@/features/i18n/i18n-context"
import { StepShell } from "@/features/onboarding/components/step-shell"
import {
  SelectableRow,
  SelectableGroup,
} from "@/features/onboarding/components/selectable"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import {
  effectiveSteps,
  farmSizes,
  nextStep,
  previousStep,
  producerTypes,
  stepIndex,
} from "@/features/onboarding/steps"

export default function SellerFarmPage() {
  const router = useRouter()
  const { t } = useI18n()
  const { draft, updateSeller } = useOnboarding()
  const seller = draft.seller

  const canContinue =
    seller.farmName.trim().length >= 2 &&
    seller.producerType.length > 0 &&
    seller.farmSize.length > 0

  const target = nextStep("seller", "farm", seller.entityType)
  const back = previousStep("seller", "farm", seller.entityType)

  return (
    <StepShell
      step={stepIndex("seller", "farm", seller.entityType) + 1}
      totalSteps={effectiveSteps("seller", seller.entityType).length}
      backHref={back?.href ?? "/"}
      title={t("onboarding.farm.title")}
      description={t("onboarding.farm.description")}
      skipHref={target?.href}
      footer={
        <Button
          size="xl"
          className="w-full"
          disabled={!canContinue}
          onClick={() => target && router.push(target.href)}
        >
          {t("common.continue")}
          <ArrowRightIcon />
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        <FieldGroup>
          <FieldGroupRow label={t("onboarding.farm.farmLabel")} htmlFor="farmName">
            <FieldGroupInput
              id="farmName"
              placeholder={t("onboarding.farm.farmPlaceholder")}
              value={seller.farmName}
              onChange={(event) => updateSeller({ farmName: event.target.value })}
            />
          </FieldGroupRow>
          <FieldGroupRow label={t("onboarding.farm.regionLabel")} htmlFor="region">
            <FieldGroupInput
              id="region"
              placeholder={t("onboarding.farm.regionPlaceholder")}
              value={seller.region}
              onChange={(event) => updateSeller({ region: event.target.value })}
            />
          </FieldGroupRow>
        </FieldGroup>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[14px] font-semibold">
            {t("onboarding.farm.sellingAsLegend")}
          </legend>
          <SelectableGroup>
            {producerTypes.map((type) => (
              <SelectableRow
                key={type}
                name="producerType"
                label={t(`onboarding.options.producerTypes.${type}`)}
                selected={seller.producerType === type}
                onSelect={() => updateSeller({ producerType: type })}
              />
            ))}
          </SelectableGroup>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[14px] font-semibold">
            {t("onboarding.farm.landLegend")}
          </legend>
          <SelectableGroup>
            {farmSizes.map((size) => (
              <SelectableRow
                key={size}
                name="farmSize"
                label={t(`onboarding.options.farmSizes.${size}`)}
                selected={seller.farmSize === size}
                onSelect={() => updateSeller({ farmSize: size })}
              />
            ))}
          </SelectableGroup>
        </fieldset>
      </div>
    </StepShell>
  )
}
