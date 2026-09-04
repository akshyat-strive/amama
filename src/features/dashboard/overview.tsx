import Link from "next/link"
import { ArrowRightIcon, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import type { OnboardingRole } from "@/features/onboarding/types"

const copy: Record<
  OnboardingRole,
  {
    description: string
    emptyTitle: string
    emptyDescription: string
    cta: { label: string; href: string }
  }
> = {
  buyer: {
    description:
      "This is where your sourcing activity, orders and shipments will live once they start moving.",
    emptyTitle: "No active sourcing yet",
    emptyDescription:
      "Once you're matched with growers for the crops you picked, they'll show up here.",
    cta: { label: "Review sourcing", href: "/buyer/dashboard/sourcing" },
  },
  seller: {
    description:
      "This is where your listings, orders and buyer messages will live once they start moving.",
    emptyTitle: "No listings yet",
    emptyDescription:
      "Add your first harvest listing and buyers searching your crops can find it.",
    cta: { label: "Add a listing", href: "/seller/dashboard/listings" },
  },
}

/** `Overview` is the only real dashboard route content so far; everything
 *  else in the sidebar points at `<ComingSoon>` — see nav-config.ts. */
function DashboardOverview({
  role,
  emptyIcon: EmptyIcon,
}: {
  role: OnboardingRole
  emptyIcon: LucideIcon
}) {
  const { draft } = useOnboarding()
  const person = role === "buyer" ? draft.buyer : draft.seller
  const firstName = person.fullName.trim().split(" ")[0]
  const content = copy[role]

  return (
    <div>
      <h1 className="text-[24px] font-bold tracking-tight">
        {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
      </h1>
      <p className="mt-1 text-[15px] text-muted-foreground">
        {content.description}
      </p>

      <div className="mt-8 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border py-16 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-amama-subtle text-amama-deep">
          <EmptyIcon className="size-5" strokeWidth={2.25} />
        </span>
        <h2 className="text-[17px] font-bold">{content.emptyTitle}</h2>
        <p className="max-w-xs text-[14px] leading-relaxed text-muted-foreground">
          {content.emptyDescription}
        </p>
        <Link
          href={content.cta.href}
          className={cn(buttonVariants({ size: "sm" }), "mt-2")}
        >
          {content.cta.label}
          <ArrowRightIcon className="rtl:-scale-x-100" />
        </Link>
      </div>
    </div>
  )
}

export { DashboardOverview }
