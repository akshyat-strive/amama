"use client"

import { useRouter } from "next/navigation"
import { ArrowRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
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

export default function BuyerVolumePage() {
  const router = useRouter()
  const { draft, updateBuyer } = useOnboarding()
  const buyer = draft.buyer

  const canContinue = buyer.annualVolume.length > 0 && buyer.incoterm.length > 0
  const target = nextStep("buyer", "volume", buyer.accountType)
  const back = previousStep("buyer", "volume", buyer.accountType)

  return (
    <StepShell
      step={stepIndex("buyer", "volume", buyer.accountType) + 1}
      totalSteps={effectiveSteps("buyer", buyer.accountType).length}
      backHref={back?.href ?? "/"}
      title="How do you like to trade?"
      description="This shapes the quotes you get. Nothing here is binding — you can change it per order."
      skipHref={target?.href}
      footer={
        <Button
          size="xl"
          className="w-full"
          disabled={!canContinue}
          onClick={() => target && router.push(target.href)}
        >
          Continue
          <ArrowRightIcon className="rtl:-scale-x-100" />
        </Button>
      }
    >
      <div className="flex flex-col gap-8">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[14px] font-semibold">
            Expected annual volume
          </legend>
          <SelectableGroup>
            {annualVolumes.map((volume) => (
              <SelectableRow
                key={volume}
                name="annualVolume"
                label={volume}
                selected={buyer.annualVolume === volume}
                onSelect={() => updateBuyer({ annualVolume: volume })}
              />
            ))}
          </SelectableGroup>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[14px] font-semibold">
            Preferred incoterm
          </legend>
          <SelectableGroup>
            {incoterms.map((term) => (
              <SelectableRow
                key={term}
                name="incoterm"
                label={term}
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
