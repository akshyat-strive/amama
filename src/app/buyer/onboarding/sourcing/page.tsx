"use client"

import { useRouter } from "next/navigation"
import { ArrowRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { StepShell } from "@/features/onboarding/components/step-shell"
import { SelectableTile } from "@/features/onboarding/components/selectable"
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
  const { draft, updateBuyer } = useOnboarding()
  const picked = draft.buyer.sourcing
  const accountType = draft.buyer.accountType

  const toggle = (id: string) =>
    updateBuyer((prev) => ({
      sourcing: prev.sourcing.includes(id)
        ? prev.sourcing.filter((crop) => crop !== id)
        : [...prev.sourcing, id],
    }))

  const target = nextStep("buyer", "sourcing", accountType)
  const back = previousStep("buyer", "sourcing", accountType)

  return (
    <StepShell
      step={stepIndex("buyer", "sourcing", accountType) + 1}
      totalSteps={effectiveSteps("buyer", accountType).length}
      backHref={back?.href ?? "/"}
      title="What do you want to source?"
      description="Pick as many as you like — you can always add more later. We'll match you with growers who have them ready this season."
      skipHref={target?.href}
      footer={
        <Button
          size="xl"
          className="w-full"
          onClick={() => target && router.push(target.href)}
        >
          {picked.length > 0 ? `Continue with ${picked.length}` : "Continue"}
          <ArrowRightIcon className="rtl:-scale-x-100" />
        </Button>
      }
    >
      <p aria-live="polite" className="sr-only">
        {picked.length} selected
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {crops.map((crop) => (
          <SelectableTile
            key={crop.id}
            label={crop.label}
            photo={{ src: cropImageUrl(crop.photo), alt: crop.label }}
            selected={picked.includes(crop.id)}
            onToggle={() => toggle(crop.id)}
          />
        ))}
      </div>
    </StepShell>
  )
}
