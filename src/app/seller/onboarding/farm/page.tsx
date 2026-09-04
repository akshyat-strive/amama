"use client"

import { useRouter } from "next/navigation"
import { ArrowRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  FieldGroup,
  FieldGroupRow,
  FieldGroupInput,
} from "@/components/ui/field-group"
import { StepShell } from "@/features/onboarding/components/step-shell"
import {
  SelectableRow,
  SelectableGroup,
} from "@/features/onboarding/components/selectable"
import { CountryCombobox } from "@/features/onboarding/components/country-select"
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
  const { draft, updateSeller } = useOnboarding()
  const seller = draft.seller

  const canContinue =
    seller.farmName.trim().length >= 2 &&
    seller.country.trim().length >= 2 &&
    seller.producerType.length > 0 &&
    seller.farmSize.length > 0

  const target = nextStep("seller", "farm", seller.accountType)
  const back = previousStep("seller", "farm", seller.accountType)

  return (
    <StepShell
      step={stepIndex("seller", "farm", seller.accountType) + 1}
      totalSteps={effectiveSteps("seller", seller.accountType).length}
      backHref={back?.href ?? "/"}
      title="Tell us about your farm"
      description="Buyers see origin details first. The fuller this is, the more enquiries you get."
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
      <div className="flex flex-col gap-6">
        <FieldGroup>
          <FieldGroupRow label="Farm" htmlFor="farmName">
            <FieldGroupInput
              id="farmName"
              placeholder="Krishna Valley Farmers Cooperative"
              value={seller.farmName}
              onChange={(event) => updateSeller({ farmName: event.target.value })}
            />
          </FieldGroupRow>
          <FieldGroupRow label="Country" htmlFor="sellerCountry">
            <CountryCombobox
              id="sellerCountry"
              value={seller.country}
              onValueChange={(country) => updateSeller({ country })}
            />
          </FieldGroupRow>
          <FieldGroupRow label="Region" htmlFor="region">
            <FieldGroupInput
              id="region"
              placeholder="Nashik, Maharashtra"
              value={seller.region}
              onChange={(event) => updateSeller({ region: event.target.value })}
            />
          </FieldGroupRow>
        </FieldGroup>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[14px] font-semibold">
            Who are you selling as?
          </legend>
          <SelectableGroup>
            {producerTypes.map((type) => (
              <SelectableRow
                key={type}
                name="producerType"
                label={type}
                selected={seller.producerType === type}
                onSelect={() => updateSeller({ producerType: type })}
              />
            ))}
          </SelectableGroup>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[14px] font-semibold">
            Land under cultivation
          </legend>
          <SelectableGroup>
            {farmSizes.map((size) => (
              <SelectableRow
                key={size}
                name="farmSize"
                label={size}
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
