"use client"

import Link from "next/link"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { SuccessIllustration } from "@/features/onboarding/components/illustrations"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import type { OnboardingRole } from "@/features/onboarding/types"

const copy: Record<
  OnboardingRole,
  { title: string; description: string; next: string[] }
> = {
  buyer: {
    title: "You're in",
    description:
      "We're matching your sourcing list against growers with stock this season.",
    next: [
      "Browse verified lots at origin",
      "Request samples and quotes",
      "Complete KYC before your first contract",
    ],
  },
  seller: {
    title: "You're in",
    description:
      "Your farm profile is live. Buyers searching your crops can find you now.",
    next: [
      "Add your first harvest listing",
      "Upload certificates and land documents",
      "Set the payment terms you accept",
    ],
  },
}

function DoneStep({ role }: { role: OnboardingRole }) {
  const { draft } = useOnboarding()
  const name =
    (role === "buyer" ? draft.buyer.fullName : draft.seller.fullName).split(
      " "
    )[0] || null
  const content = copy[role]

  return (
    <div className="flex min-h-dvh flex-col bg-card">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-5 py-12 text-center">
        <SuccessIllustration className="max-w-[200px]" />
        <h1 className="mt-6 text-[32px] font-bold leading-tight tracking-tight">
          {name ? `${content.title}, ${name}` : content.title}
        </h1>
        <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-pretty text-muted-foreground">
          {content.description}
        </p>

        <ul className="mt-8 flex w-full flex-col gap-2 text-start">
          {content.next.map((item, index) => (
            <li
              key={item}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5"
            >
              <span
                aria-hidden
                className="grid size-7 shrink-0 place-items-center rounded-full bg-amama-subtle text-[13px] font-bold text-amama-deep"
              >
                {index + 1}
              </span>
              <span className="text-[15px] font-medium">{item}</span>
            </li>
          ))}
        </ul>
      </main>

      <footer className="sticky bottom-0 border-t border-border/60 bg-background/90 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-lg px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <Link
            href={`/${role}/dashboard`}
            className={cn(buttonVariants({ size: "xl" }), "w-full")}
          >
            Go to my dashboard
          </Link>
        </div>
      </footer>
    </div>
  )
}

export { DoneStep }
