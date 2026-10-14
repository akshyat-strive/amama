"use client"

import Link from "next/link"
import { CheckIcon, CrownIcon, GemIcon, LockIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Panel } from "@/features/dashboard/dashboard-ui"
import { usePlan, type PlanTier } from "@/features/dashboard/plan-store"
import { PixelHalftone } from "@/features/landing/pixel-halftone"
import type { OnboardingRole } from "@/features/onboarding/types"

const PLAN_LABELS: Record<PlanTier, string> = {
  free: "No plan",
  pro: "amama Pro",
  gold: "amama Gold",
}

const PRO_FEATURES = [
  "Buyers and sellers connect one to one",
  "Faster account manager response",
  "Unlimited RFQs and listings",
  "Advanced deal and shipment analytics",
  "Priority document review",
]

const GOLD_FEATURES = [
  "Priority KAM assistance",
  "Post a requirement and a need-by date — KAMs pool the demand and arrange the supply",
  "Dynamic lot sizing",
  "White-glove contract concierge",
  "Featured placement in RFQs and search",
  "Early access to new sellers and buyers",
]

/**
 * Pro and Gold, as on the landing page. Plans open up once the account's
 * KYC is approved and kept current; until then the cards show, but the
 * choice is locked and points at Verification.
 */
function PlansPanel({ role, unlocked = true }: { role: OnboardingRole; unlocked?: boolean }) {
  const [tier, setTier] = usePlan(`amama.plan.${role}`)

  return (
    <Panel
      title="Plan"
      subtitle={unlocked ? (tier === "free" ? "Choose the plan that fits how you trade." : `You're on ${PLAN_LABELS[tier]}.`) : "Plans open up once your KYC is approved."}
      className="mt-3 bg-card"
      action={
        tier !== "free" && unlocked ? (
          <button type="button" onClick={() => setTier("free")} className="text-[13px] font-medium text-muted-foreground hover:text-foreground">
            Cancel plan
          </button>
        ) : null
      }
    >
      <div className="grid gap-3 p-3 lg:grid-cols-2">
        <PlanCard
          tone="pro"
          name="Pro"
          tagline="Trade directly, with more on tap."
          features={PRO_FEATURES}
          active={tier === "pro"}
          locked={!unlocked}
          role={role}
          onSelect={() => setTier("pro")}
        />
        <PlanCard
          tone="gold"
          name="Gold"
          tagline="Say what you need. We arrange it."
          features={GOLD_FEATURES}
          active={tier === "gold"}
          locked={!unlocked}
          role={role}
          onSelect={() => setTier("gold")}
        />
      </div>
    </Panel>
  )
}

function PlanCard({
  tone,
  name,
  tagline,
  features,
  active,
  locked,
  role,
  onSelect,
}: {
  tone: "pro" | "gold"
  name: string
  tagline: string
  features: string[]
  active: boolean
  locked: boolean
  role: OnboardingRole
  onSelect: () => void
}) {
  const gold = tone === "gold"
  const Icon = gold ? CrownIcon : GemIcon
  return (
    <div className={cn("relative isolate flex flex-col overflow-hidden rounded-[24px] p-6", gold ? "bg-[#f3e7c9] text-[#3b2a06]" : "bg-[#1d1d1f] text-white")}>
      <PixelHalftone color={gold ? "rgba(176,124,20,0.3)" : "rgba(255,255,255,0.2)"} shape="top-right" seed={gold ? 9 : 5} strength={0.75} className="-z-10" />
      <div className="flex items-center justify-between gap-2">
        <p className={cn("flex items-center gap-1.5 text-[14px]", gold ? "text-[#3b2a06]/65" : "text-white/60")}>
          <Icon aria-hidden className="size-4" strokeWidth={1.75} /> amama {name}
        </p>
        {active ? <span className={cn("rounded-full px-2.5 py-1 text-[11.5px] font-medium", gold ? "bg-[#3b2a06]/10" : "bg-white/15")}>Current plan</span> : null}
      </div>
      <p className="mt-1 text-[34px] leading-none font-semibold tracking-[-0.03em]">{name}</p>
      <p className={cn("mt-2 text-[14px]", gold ? "text-[#3b2a06]/70" : "text-white/65")}>{tagline}</p>

      <ul className="mt-6 flex-1">
        {features.map((feature) => (
          <li key={feature} className={cn("flex items-start gap-2.5 border-t py-2.5 text-[13.5px] leading-snug first:border-0", gold ? "border-[#3b2a06]/12" : "border-white/12 text-white/90")}>
            <CheckIcon aria-hidden className="mt-0.5 size-3.5 shrink-0 opacity-70" />
            {feature}
          </li>
        ))}
      </ul>

      <div className="mt-6">
        {locked ? (
          <Link
            href={`/${role}/dashboard/verification`}
            className={cn("inline-flex h-10 items-center gap-2 rounded-full px-5 text-[14px] transition-colors", gold ? "bg-[#3b2a06]/10 hover:bg-[#3b2a06]/15" : "bg-white/12 hover:bg-white/18")}
          >
            <LockIcon aria-hidden className="size-3.5" />
            Complete KYC to unlock
          </Link>
        ) : (
          <button
            type="button"
            disabled={active}
            onClick={onSelect}
            className={cn(
              "inline-flex h-10 items-center rounded-full px-5 text-[14px] transition-[background-color,transform] active:scale-[0.97] disabled:pointer-events-none",
              gold ? "bg-[#3b2a06] text-[#f3e7c9] hover:bg-[#2a1e04] disabled:bg-[#3b2a06]/15 disabled:text-[#3b2a06]" : "bg-white text-[#1d1d1f] hover:bg-white/90 disabled:bg-white/15 disabled:text-white"
            )}
          >
            {active ? "Current plan" : `Choose ${name}`}
          </button>
        )}
      </div>
    </div>
  )
}

export { PlansPanel }
