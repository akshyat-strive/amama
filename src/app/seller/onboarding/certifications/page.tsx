"use client"

import { useRouter } from "next/navigation"
import {
  ArrowRightIcon,
  Award,
  CircleDashed,
  ClipboardCheck,
  Handshake,
  Leaf,
  Moon,
  ShieldCheck,
  TreePine,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { StepShell } from "@/features/onboarding/components/step-shell"
import { SelectableTile } from "@/features/onboarding/components/selectable"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import {
  certifications,
  effectiveSteps,
  nextStep,
  previousStep,
  stepIndex,
} from "@/features/onboarding/steps"

const icons: Record<string, LucideIcon> = {
  Leaf,
  Handshake,
  ShieldCheck,
  TreePine,
  ClipboardCheck,
  Award,
  Moon,
  CircleDashed,
}

export default function SellerCertificationsPage() {
  const router = useRouter()
  const { draft, updateSeller } = useOnboarding()
  const picked = draft.seller.certifications

  /** "None yet" is exclusive — it cannot coexist with a real certificate. */
  const toggle = (id: string) =>
    updateSeller((prev) => {
      if (id === "none") {
        return {
          certifications: prev.certifications.includes("none") ? [] : ["none"],
        }
      }
      const withoutNone = prev.certifications.filter((entry) => entry !== "none")
      return {
        certifications: withoutNone.includes(id)
          ? withoutNone.filter((entry) => entry !== id)
          : [...withoutNone, id],
      }
    })

  const accountType = draft.seller.accountType
  const target = nextStep("seller", "certifications", accountType)
  const back = previousStep("seller", "certifications", accountType)

  return (
    <StepShell
      step={stepIndex("seller", "certifications", accountType) + 1}
      totalSteps={effectiveSteps("seller", accountType).length}
      backHref={back?.href ?? "/"}
      title="Any certifications?"
      description="Certified lots earn better prices. No certificates yet? Skip this — we'll show you the route to one."
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
      <div className="grid grid-cols-2 gap-3">
        {certifications.map((certification) => {
          const Icon = icons[certification.icon]
          return (
            <SelectableTile
              key={certification.id}
              label={certification.label}
              hint={certification.hint}
              icon={<Icon className="size-4.5" strokeWidth={2.25} />}
              selected={picked.includes(certification.id)}
              onToggle={() => toggle(certification.id)}
            />
          )
        })}
      </div>
    </StepShell>
  )
}
