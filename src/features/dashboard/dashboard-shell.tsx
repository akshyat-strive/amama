"use client"

import * as React from "react"
import Link from "next/link"
import { MenuIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetCloseButton } from "@/components/ui/sheet"
import { NavList } from "@/features/dashboard/nav-list"
import { dashboardNav } from "@/features/dashboard/nav-config"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import type { OnboardingRole } from "@/features/onboarding/types"

const otherRole: Record<OnboardingRole, { label: string; href: string }> = {
  buyer: { label: "Selling instead?", href: "/seller/login" },
  seller: { label: "Buying instead?", href: "/buyer/login" },
}

/**
 * The shell every `/[role]/dashboard/*` page renders inside: a topbar, and
 * below it a persistent left sidebar plus the page body. On narrow screens
 * the sidebar becomes a slide-in drawer opened from the topbar instead of
 * disappearing — the nav is the same list either way, via `<NavList>`.
 */
function DashboardShell({
  role,
  children,
}: {
  role: OnboardingRole
  children: React.ReactNode
}) {
  const { draft } = useOnboarding()
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false)
  const nav = dashboardNav[role]

  const person = role === "buyer" ? draft.buyer : draft.seller
  const displayName = person.fullName.trim() || "Your account"
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-4 sm:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="-ms-2 lg:hidden"
          aria-label="Open menu"
          onClick={() => setMobileNavOpen(true)}
        >
          <MenuIcon />
        </Button>
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-amama-deep"
        >
          amama
        </Link>
        <span className="hidden rounded-full bg-muted px-2.5 py-1 text-[12px] font-medium text-muted-foreground sm:inline-block">
          {role === "buyer" ? "Buyer" : "Seller"}
        </span>

        <div className="ms-auto flex items-center gap-3">
          <Link
            href={otherRole[role].href}
            className="hidden text-[13px] font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground sm:inline-block"
          >
            {otherRole[role].label}
          </Link>
          <span
            className="grid size-9 place-items-center rounded-full bg-amama-deep text-[14px] font-semibold text-white"
            title={displayName}
          >
            {initial}
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-60 shrink-0 overflow-y-auto border-e border-border p-3 lg:block">
          <NavList items={nav} />
        </aside>

        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="start" aria-label="Navigation">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold tracking-tight text-amama-deep">
                amama
              </span>
              <SheetCloseButton />
            </div>
            <NavList items={nav} onNavigate={() => setMobileNavOpen(false)} />
          </SheetContent>
        </Sheet>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export { DashboardShell }
