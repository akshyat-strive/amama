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
  businessTypes,
  effectiveSteps,
  nextStep,
  previousStep,
  stepIndex,
} from "@/features/onboarding/steps"

export default function BuyerCompanyPage() {
  const router = useRouter()
  const { draft, updateBuyer } = useOnboarding()
  const buyer = draft.buyer

  const canContinue =
    buyer.companyName.trim().length >= 2 &&
    buyer.country.trim().length >= 2 &&
    buyer.businessType.length > 0

  const target = nextStep("buyer", "company", buyer.accountType)
  const back = previousStep("buyer", "company", buyer.accountType)

  return (
    <StepShell
      step={stepIndex("buyer", "company", buyer.accountType) + 1}
      totalSteps={effectiveSteps("buyer", buyer.accountType).length}
      backHref={back?.href ?? "/"}
      title="Tell us about your business"
      description="Growers see this before they accept an enquiry — it's how trust starts."
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
          <FieldGroupRow label="Company" htmlFor="companyName">
            <FieldGroupInput
              id="companyName"
              autoComplete="organization"
              placeholder="Northwind Foods Ltd"
              value={buyer.companyName}
              onChange={(event) =>
                updateBuyer({ companyName: event.target.value })
              }
            />
          </FieldGroupRow>
          <FieldGroupRow label="Country" htmlFor="country">
            <CountryCombobox
              id="country"
              value={buyer.country}
              onValueChange={(country) => updateBuyer({ country })}
            />
          </FieldGroupRow>
          <FieldGroupRow label="Licence" htmlFor="importLicence">
            <FieldGroupInput
              id="importLicence"
              placeholder="Add it now or later"
              value={buyer.importLicence}
              onChange={(event) =>
                updateBuyer({ importLicence: event.target.value })
              }
            />
          </FieldGroupRow>
        </FieldGroup>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[14px] font-semibold">
            What kind of business is it?
          </legend>
          <SelectableGroup>
            {businessTypes.map((type) => (
              <SelectableRow
                key={type}
                name="businessType"
                label={type}
                selected={buyer.businessType === type}
                onSelect={() => updateBuyer({ businessType: type })}
              />
            ))}
          </SelectableGroup>
        </fieldset>
      </div>
    </StepShell>
  )
}
