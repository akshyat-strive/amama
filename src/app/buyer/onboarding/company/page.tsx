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
import { ChoiceChips } from "@/features/onboarding/components/selectable"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import {
  businessTypes,
  effectiveSteps,
  nextStep,
  previousStep,
  stepIndex,
} from "@/features/onboarding/steps"

export default function BuyerCompanyPage() {
  const router = useRouter()
  const { t } = useI18n()
  const { draft, updateBuyer } = useOnboarding()
  const buyer = draft.buyer

  const canContinue =
    buyer.companyName.trim().length >= 2 && buyer.businessType.length > 0

  const target = nextStep("buyer", "company", buyer.entityType)
  const back = previousStep("buyer", "company", buyer.entityType)

  return (
    <StepShell
      step={stepIndex("buyer", "company", buyer.entityType) + 1}
      totalSteps={effectiveSteps("buyer", buyer.entityType).length}
      backHref={back?.href ?? "/"}
      title={t("onboarding.company.title")}
      description={t("onboarding.company.description")}
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
          <FieldGroupRow label={t("onboarding.company.companyLabel")} htmlFor="companyName">
            <FieldGroupInput
              id="companyName"
              autoComplete="organization"
              placeholder={t("onboarding.company.companyPlaceholder")}
              value={buyer.companyName}
              onChange={(event) =>
                updateBuyer({ companyName: event.target.value })
              }
            />
          </FieldGroupRow>
          <FieldGroupRow label={t("onboarding.company.licenceLabel")} htmlFor="importLicence">
            <FieldGroupInput
              id="importLicence"
              placeholder={t("onboarding.company.licencePlaceholder")}
              value={buyer.importLicence}
              onChange={(event) =>
                updateBuyer({ importLicence: event.target.value })
              }
            />
          </FieldGroupRow>
        </FieldGroup>

        <fieldset>
          <legend className="text-[14px] font-semibold">
            {t("onboarding.company.businessTypeLegend")}
          </legend>
          <ChoiceChips
            label={t("onboarding.company.businessTypeLegend")}
            className="mt-2.5 sm:grid-cols-3"
            value={buyer.businessType}
            options={businessTypes.map((type) => ({ value: type, label: t(`onboarding.options.businessTypes.${type}`) }))}
            onChange={(businessType) => updateBuyer({ businessType })}
          />
        </fieldset>
      </div>
    </StepShell>
  )
}
