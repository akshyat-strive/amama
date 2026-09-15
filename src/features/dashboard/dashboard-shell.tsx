"use client"

import * as React from "react"
import Link from "next/link"
import { ChartNoAxesGantt } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LanguageSwitcher } from "@/features/i18n/components/language-switcher"
import { NavList } from "@/features/dashboard/nav-list"
import { dashboardNav } from "@/features/dashboard/nav-config"
import { useSidebarOpen } from "@/features/dashboard/sidebar-open-store"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import type { OnboardingRole } from "@/features/onboarding/types"

const SIDEBAR_STORAGE_KEY = "amama.dashboardSidebarOpen"

/** The topbar's height, kept in one place since both the header itself and
 *  everything that sits below it (sidebar, scrollable content) need to agree
 *  on it. */
const TOPBAR_OFFSET = "pt-20"

/**
 * The shell every `/[role]/dashboard/*` page renders inside: a topbar fixed
 * to the very top of the viewport, transparent between its own floating
 * chips rather than a solid bar — so scrolled content passes *behind* it
 * instead of stopping at a hard edge, the way it does under a translucent
 * iOS nav bar. Everything below (sidebar, scrollable content) reserves that
 * same height as top padding so nothing starts out hidden underneath it.
 *
 * Below the topbar, the sidebar floats over the canvas rather than sitting
 * flush against it — its own rounded, shadowed card, inset with a gap on
 * every side, the way a popover reads as a distinct surface rather than
 * another panel bolted to the layout.
 *
 * The one `sidebarOpen` toggle means something different at each
 * breakpoint, which is what makes three visual states out of one boolean:
 *  - Desktop: collapsed is a narrow icon-only rail, never fully hidden —
 *    it still pushes the body over, just less.
 *  - Mobile: collapsed means gone entirely (there's no spare width for a
 *    rail to live in), sliding back in as a full icon+label overlay when
 *    opened.
 * `NavList`'s own `expanded` prop (driven by this same boolean) is what
 * switches between icon+label and icon-only — the width change here and
 * the label visibility there have to move together or the rail would clip
 * text instead of hiding it.
 */
const RAIL_WIDTH_MD = "md:w-[84px]"

function DashboardShell({
  role,
  children,
}: {
  role: OnboardingRole
  children: React.ReactNode
}) {
  const { draft } = useOnboarding()
  const [sidebarOpen, setSidebarOpen] = useSidebarOpen(SIDEBAR_STORAGE_KEY)
  const nav = dashboardNav[role]

  const toggleSidebar = () => {
    setSidebarOpen((open) => !open)
  }

  const person = role === "buyer" ? draft.buyer : draft.seller
  const displayName = person.fullName.trim() || "Your account"
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <div className="h-dvh bg-background">
      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center gap-3 bg-transparent pr-4 sm:pr-6">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-l-none border-l-0 border-black bg-amama text-amama-foreground hover:bg-amama-hover hover:text-white"
          aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
          aria-pressed={sidebarOpen}
          onClick={toggleSidebar}
        >
          <ChartNoAxesGantt />
        </Button>
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-amama-deep"
        >
          amama
        </Link>
        <span className="hidden items-center gap-2 sm:flex">
          <span aria-hidden className="h-4 w-px bg-border" />
          <span className="text-[15px] font-medium text-muted-foreground">
            {role === "buyer" ? "buyer" : "seller"}
          </span>
        </span>

        <div className="ms-auto flex items-center gap-3">
          <LanguageSwitcher variant="inline" />
          <span
            className="grid size-10 place-items-center rounded-full bg-amama-deep text-[14px] font-semibold text-white shadow-floating"
            title={displayName}
          >
            {initial}
          </span>
        </div>
      </header>

      {/* The sidebar-to-body gap is one `gap-4` (16px) — the same value the
          content grids below use between their own cards, so the outer
          rhythm (rail to canvas) reads as the same unit as the inner one
          (card to card) instead of a bigger, unrelated margin. The sidebar
          card's own end-side padding is dropped in favour of this shared
          gap so the two don't stack into a bigger gap than either alone. */}
      <div className="relative flex h-full overflow-hidden md:gap-4">
        {/* Mobile backdrop — only meaningful once the sidebar is an overlay
            (below `md`), so it's invisible and non-interactive above that
            breakpoint even while `sidebarOpen` is true. */}
        <button
          type="button"
          aria-hidden={!sidebarOpen}
          tabIndex={-1}
          onClick={() => setSidebarOpen(false)}
          className={cn(
            "fixed inset-0 z-30 bg-foreground/20 transition-opacity duration-300 md:hidden",
            sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
          )}
        />

        {/* Outer wrapper: the thing whose *layout* size changes. Fixed and
            full-height below `md` (an overlay doesn't take up flex space to
            begin with), back in normal flow above it where its width is
            what pushes or reclaims the body's space. Collapsed width is `0`
            below `md` (nothing to shrink to) and the icon rail at `md` and
            up (never fully hidden there). */}
        <div
          className={cn(
            "fixed inset-y-0 start-0 z-40 min-w-0 overflow-hidden md:static md:inset-auto md:z-auto md:shrink-0",
            "transition-[width] duration-300 ease-out",
            sidebarOpen ? "w-72" : cn("w-0", RAIL_WIDTH_MD)
          )}
        >
          {/* Inner panel: matches the outer wrapper's width exactly — a
              collapsed rail needs to actually be narrow (icons reflow into
              it), not just clipped by the wrapper while staying full-width
              underneath. The transform is only how mobile hides it;
              desktop's collapsed rail never translates, it just resizes. */}
          <div
            className={cn(
              "h-full p-3 transition-[width,transform] duration-300 ease-out md:pe-0",
              TOPBAR_OFFSET,
              sidebarOpen ? "w-72" : cn("w-72", RAIL_WIDTH_MD),
              sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 rtl:translate-x-full md:rtl:translate-x-0"
            )}
          >
            <div
              className={cn(
                "flex h-full flex-col bg-card p-3 shadow-lg ring-1 ring-border",
                sidebarOpen ? "rounded-3xl" : "rounded-full"
              )}
            >
              <NavList
                items={nav}
                expanded={sidebarOpen}
                onNavigate={() => {
                  if (window.matchMedia("(max-width: 767px)").matches) {
                    setSidebarOpen(false)
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* No top padding on `main` itself — it has to stay full-height so
            its scrolled content actually passes behind the fixed, mostly
            transparent header instead of stopping short of it. The offset
            lives on the inner wrapper instead, as space content starts
            below rather than a boundary content can't cross. */}
        <main className="min-w-0 flex-1 overflow-y-auto">
          {/* `pb-3` on purpose, not the bigger `pb-6`/`pb-8` this used to
              carry — it matches the sidebar card's own bottom inset (`p-3`)
              exactly, so the page's bottom edge and the rail's bottom edge
              read as the same margin instead of the body trailing off with
              extra room the sidebar doesn't get. */}
          <div
            className={cn(
              "mx-auto w-full max-w-6xl px-4 pb-3 sm:px-6 md:ps-0",
              TOPBAR_OFFSET
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export { DashboardShell }
