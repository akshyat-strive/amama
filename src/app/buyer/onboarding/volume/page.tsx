"use client"

import { useRouter } from "next/navigation"
import { ArrowRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useI18n } from "@/features/i18n/i18n-context"
import { StepShell } from "@/features/onboarding/components/step-shell"
import {
  SelectableRow,
  SelectableGroup,
} from "@/features/onboarding/components/selectable"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import {
  annualVolumes,
  effectiveSteps,
  incoterms,
  nextStep,
  previousStep,
  stepIndex,
} from "@/features/onboarding/steps"
import { IncotermInfoButton } from "@/features/marketplace/incoterm-picker"

export default function BuyerVolumePage() {
  const router = useRouter()
  const { t } = useI18n()
  const { draft, updateBuyer } = useOnboarding()
  const buyer = draft.buyer

  const canContinue = buyer.annualVolume.length > 0 && buyer.incoterm.length > 0
  const target = nextStep("buyer", "volume", buyer.entityType)
  const back = previousStep("buyer", "volume", buyer.entityType)

  return (
    <StepShell
      step={stepIndex("buyer", "volume", buyer.entityType) + 1}
      totalSteps={effectiveSteps("buyer", buyer.entityType).length}
      backHref={back?.href ?? "/"}
      title={t("onboarding.volume.title")}
      description={t("onboarding.volume.description")}
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
      <div className="flex flex-col gap-8">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[14px] font-semibold">
            {t("onboarding.volume.annualVolumeLegend")}
          </legend>
          <SelectableGroup>
            {annualVolumes.map((volume) => (
              <SelectableRow
                key={volume}
                name="annualVolume"
                label={t(`onboarding.options.annualVolumes.${volume}`)}
                selected={buyer.annualVolume === volume}
                onSelect={() => updateBuyer({ annualVolume: volume })}
              />
            ))}
          </SelectableGroup>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 flex items-center gap-1.5 text-[14px] font-semibold">
            {t("onboarding.volume.incotermLegend")}
            <IncotermInfoButton />
          </legend>
          <SelectableGroup>
            {incoterms.map((term) => (
              <SelectableRow
                key={term}
                name="incoterm"
                label={t(`onboarding.options.incoterms.${term}`)}
                selected={buyer.incoterm === term}
                onSelect={() => updateBuyer({ incoterm: term })}
              />
            ))}
          </SelectableGroup>
        </fieldset>
      </div>
    </StepShell>
  )
}
