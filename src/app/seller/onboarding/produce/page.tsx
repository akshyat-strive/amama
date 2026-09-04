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

export default function SellerProducePage() {
  const router = useRouter()
  const { draft, updateSeller } = useOnboarding()
  const picked = draft.seller.produce
  const accountType = draft.seller.accountType

  const toggle = (id: string) =>
    updateSeller((prev) => ({
      produce: prev.produce.includes(id)
        ? prev.produce.filter((crop) => crop !== id)
        : [...prev.produce, id],
    }))

  const target = nextStep("seller", "produce", accountType)
  const back = previousStep("seller", "produce", accountType)

  return (
    <StepShell
      step={stepIndex("seller", "produce", accountType) + 1}
      totalSteps={effectiveSteps("seller", accountType).length}
      backHref={back?.href ?? "/"}
      title="What do you grow?"
      description="Pick everything you harvest — or skip and add it once you're in."
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
        {picked.length} crops selected
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
