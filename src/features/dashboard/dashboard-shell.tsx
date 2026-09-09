"use client"

import * as React from "react"
import Link from "next/link"
import { ChartNoAxesGantt } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LanguageSwitcher } from "@/features/i18n/components/language-switcher"
import { NavList } from "@/features/dashboard/nav-list"
import { dashboardNav } from "@/features/dashboard/nav-config"
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
 * Below the topbar, a sidebar floats over the canvas rather than sitting
 * flush against it — its own rounded, shadowed card, inset with a gap on
 * every side, the way a popover reads as a distinct surface rather than
 * another panel bolted to the layout.
 *
 * There's no separate "collapsed" rail state. Closing the sidebar slides it
 * fully out of view (a transform, so it's a slide, not a squeeze) while the
 * wrapper's own layout width animates to zero in step, which is what lets
 * the body reclaim the space instead of just hiding behind it. On phone
 * widths the sidebar can't push anything — there's no spare width to push
 * into — so it becomes a full-height overlay with a backdrop instead; same
 * component, the breakpoint decides which behaviour applies.
 */
function DashboardShell({
  role,
  children,
}: {
  role: OnboardingRole
  children: React.ReactNode
}) {
  const { draft } = useOnboarding()
  // A lazy initializer, not an effect: it only ever runs once, during this
  // component's first render, so there's no second render to "correct" a
  // default the way restoring a value in an effect would need.
  // `typeof window` guards the one real difference from the onboarding
  // draft's own store — this is plain `useState`, not
  // `useSyncExternalStore`, so nothing re-runs this on the server at all.
  const [sidebarOpen, setSidebarOpen] = React.useState(() => {
    if (typeof window === "undefined") return true
    try {
      return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) !== "0"
    } catch {
      return true
    }
  })
  const nav = dashboardNav[role]

  const toggleSidebar = () => {
    setSidebarOpen((open) => {
      const next = !open
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "1" : "0")
      } catch {
        // Persistence is best-effort.
      }
      return next
    })
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
            what pushes or reclaims the body's space. */}
        <div
          className={cn(
            "fixed inset-y-0 start-0 z-40 min-w-0 overflow-hidden md:static md:inset-auto md:z-auto md:shrink-0",
            "transition-[width] duration-300 ease-out",
            sidebarOpen ? "w-72" : "w-0"
          )}
        >
          {/* Inner panel: always full width, so it's a slide (transform)
              clipped by the shrinking wrapper above, not a squeeze. The
              topbar offset lives here (not on the outer wrapper) so it
              travels with the panel instead of clipping against the
              width transition. */}
          <div
            className={cn(
              "h-full w-72 p-3 transition-transform duration-300 ease-out md:pe-0",
              TOPBAR_OFFSET,
              sidebarOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full"
            )}
          >
            {/* Fixed near-black surface, not `bg-card` — the sidebar reads
                the same in light or dark mode rather than following the
                page theme; the brand green only shows up on the active
                item, not the whole rail. */}
            <div className="flex h-full flex-col rounded-3xl bg-[#0a0a0a] p-3 shadow-lg ring-1 ring-black/20">
              <NavList
                items={nav}
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
