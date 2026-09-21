"use client"

import type { ComponentType } from "react"
import { CheckIcon, CrownIcon, SparklesIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Panel } from "@/features/dashboard/dashboard-ui"
import { usePlan, type PlanTier } from "@/features/dashboard/plan-store"
import type { OnboardingRole } from "@/features/onboarding/types"

const PLAN_LABELS: Record<PlanTier, string> = {
  free: "Standard",
  pro: "Amama Pro",
  gold: "Amama Gold",
}

const GOLD_FEATURES = [
  "Priority account manager response",
  "Featured placement in RFQs & search",
  "White-glove contract concierge",
  "Early access to new sellers & buyers",
]

const PRO_FEATURES = [
  "Faster account manager response",
  "Unlimited RFQs and listings",
  "Advanced deal & shipment analytics",
  "Priority document review",
]

/**
 * The two paid tiers, in Settings rather than Profile — a plan is billing
 * standing, not who you are (see `SettingsView`'s own account-vs-profile
 * split). Each card's `plan-gold`/`plan-pro` background (`globals.css`) is
 * the one place in the app meant to look like a different material —
 * metal, black glass — rather than a themed surface, which is why the
 * copy on top uses hard-coded light/dark text instead of the usual
 * `text-foreground` tokens: neutral text would wash out on either.
 */
function PlansPanel({ role }: { role: OnboardingRole }) {
  const [tier, setTier] = usePlan(`amama.plan.${role}`)

  return (
    <Panel
      title="Plans"
      subtitle="Upgrade for more visibility, faster support, and a dedicated concierge."
      className="mt-6"
      action={
        tier !== "free" ? (
          <button
            type="button"
            onClick={() => setTier("free")}
            className="text-[12px] font-medium text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
          >
            On {PLAN_LABELS[tier]} · move to Standard
          </button>
        ) : null
      }
    >
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <PlanCard
          tone="gold"
          icon={CrownIcon}
          name="Amama Gold"
          tagline="Ultimate luxury, premium, VIP."
          features={GOLD_FEATURES}
          active={tier === "gold"}
          onSelect={() => setTier("gold")}
        />
        <PlanCard
          tone="pro"
          icon={SparklesIcon}
          name="Amama Pro"
          tagline="Exclusive, high-end, professional."
          features={PRO_FEATURES}
          active={tier === "pro"}
          onSelect={() => setTier("pro")}
        />
      </div>
    </Panel>
  )
}

function PlanCard({
  tone,
  icon: Icon,
  name,
  tagline,
  features,
  active,
  onSelect,
}: {
  tone: "gold" | "pro"
  icon: ComponentType<{ className?: string }>
  name: string
  tagline: string
  features: string[]
  active: boolean
  onSelect: () => void
}) {
  const gold = tone === "gold"
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl p-5",
        gold ? "plan-gold" : "plan-pro"
      )}
    >
      <div className={cn("relative z-10 flex h-full flex-col gap-4", gold ? "text-[#2b1a02]" : "text-white")}>
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "grid size-10 place-items-center rounded-full",
              gold ? "bg-black/10 text-[#2b1a02]" : "bg-white/10 text-white"
            )}
          >
            <Icon className="size-5" />
          </span>
          {active ? (
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                gold ? "bg-black/10 text-[#2b1a02]" : "bg-white/15 text-white"
              )}
            >
              Current plan
            </span>
          ) : null}
        </div>

        <div>
          <p className={cn("text-[18px] font-bold tracking-tight", gold ? "text-[#2b1a02]" : "text-white")}>
            {name}
          </p>
          <p className={cn("mt-0.5 text-[13px]", gold ? "text-[#4a3210]" : "text-white/70")}>{tagline}</p>
        </div>

        <ul className="flex flex-col gap-1.5">
          {features.map((feature) => (
            <li
              key={feature}
              className={cn("flex items-start gap-1.5 text-[12.5px] leading-snug", gold ? "text-[#3b2405]" : "text-white/85")}
            >
              <CheckIcon className={cn("mt-0.5 size-3.5 shrink-0", gold ? "text-[#3b2405]" : "text-white")} />
              {feature}
            </li>
          ))}
        </ul>

        <Button
          size="sm"
          disabled={active}
          onClick={onSelect}
          className={cn(
            "mt-auto w-full",
            gold
              ? "bg-[#2b1a02] text-[#f6e3a1] hover:bg-[#3b2405] disabled:bg-black/15 disabled:text-[#2b1a02] disabled:opacity-100"
              : "bg-white text-black hover:bg-white/85 disabled:bg-white/15 disabled:text-white disabled:opacity-100"
          )}
        >
          {active ? "Current plan" : `Switch to ${name}`}
        </Button>
      </div>
    </div>
  )
}

export { PlansPanel }
