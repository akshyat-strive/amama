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
import { useI18n } from "@/features/i18n/i18n-context"
import { StepShell } from "@/features/onboarding/components/step-shell"
import {
  SelectableTile,
  SelectableTileGroup,
} from "@/features/onboarding/components/selectable"
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
  const { t } = useI18n()
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

  const entityType = draft.seller.entityType
  const target = nextStep("seller", "certifications", entityType)
  const back = previousStep("seller", "certifications", entityType)

  return (
    <StepShell
      step={stepIndex("seller", "certifications", entityType) + 1}
      totalSteps={effectiveSteps("seller", entityType).length}
      backHref={back?.href ?? "/"}
      title={t("onboarding.certifications.title")}
      description={t("onboarding.certifications.description")}
      skipHref={target?.href}
      footer={
        <Button
          size="xl"
          className="w-full"
          onClick={() => target && router.push(target.href)}
        >
          {picked.length > 0
            ? t("common.continueWithCount", { count: picked.length })
            : t("common.continue")}
          <ArrowRightIcon />
        </Button>
      }
    >
      <SelectableTileGroup
        aria-label={t("onboarding.certifications.title")}
        className="grid grid-cols-2 gap-3"
      >
        {certifications.map((certification) => {
          const Icon = icons[certification.icon]
          return (
            <SelectableTile
              key={certification.id}
              label={t(`onboarding.options.certifications.${certification.id}.label`)}
              hint={t(`onboarding.options.certifications.${certification.id}.hint`)}
              icon={<Icon className="size-4.5" strokeWidth={2.25} />}
              selected={picked.includes(certification.id)}
              onToggle={() => toggle(certification.id)}
            />
          )
        })}
      </SelectableTileGroup>
    </StepShell>
  )
}
