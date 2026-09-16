"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChartNoAxesGantt, CrownIcon, ShieldCheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LanguageSwitcher } from "@/features/i18n/components/language-switcher"
import { NavList } from "@/features/dashboard/nav-list"
import { useSidebarOpen } from "@/features/dashboard/sidebar-open-store"
import { useKamIdentity } from "@/features/admin/kam-identity"
import { adminNav, type AdminRole } from "@/features/admin/admin-nav-config"

/** `name` only covers `master`, which has no per-account identity — `kam`'s
 *  is read live from `useKamIdentity()` below instead, since it's no longer
 *  one fixed person. */
const roleContent: Record<AdminRole, { label: string; name?: string; icon: typeof ShieldCheckIcon }> = {
  kam: { label: "KAM", icon: ShieldCheckIcon },
  master: { label: "Master Admin", name: "Master Admin", icon: CrownIcon },
}

/** Same rail-width constant and rationale as `DashboardShell` — see there
 *  for why one `sidebarOpen` boolean resolves to three different visual
 *  states across the two breakpoints. */
const RAIL_WIDTH_MD = "md:w-[66px]"

/**
 * The admin module's own shell — same popover-sidebar-over-flat-canvas shape
 * as the buyer/seller dashboards (`DashboardShell`), so moving between "what
 * does the applicant-facing app look like" and "my own queue" isn't context-
 * switching between two different products. Shared by every admin role
 * (KAM, master admin, whichever comes next) rather than forked per role: the
 * only things that change are the nav items and the topbar identity chip.
 *
 * Kept as its own component rather than reusing `DashboardShell` directly:
 * that one is wired to an onboarding-draft identity (a buyer or seller's own
 * name), and admin staff have neither — just a fixed identity per role.
 */
function AdminShell({ role, children }: { role: AdminRole; children: React.ReactNode }) {
  const router = useRouter()
  const content = roleContent[role]
  const Icon = content.icon
  const storageKey = `amama.admin.${role}.sidebarOpen`
  const homeHref = role === "kam" ? "/admin/kam" : "/admin/master"

  // A KAM's identity is set at sign-in (see `admin-login-screen.tsx`) and
  // every moderation/verification action attributes to it — so unlike
  // `master` (one fixed identity, no sign-in gate needed), a KAM route
  // with nobody signed in has nowhere to attribute an action to. Bounce
  // back to sign-in rather than letting the console render with no name.
  //
  // On a real (non-client-routed) navigation, `useKamIdentity` renders
  // `null` on the hydration-matching pass even when localStorage really
  // does have an identity — the store's own post-hydration correction
  // effect fires and fixes it a moment later, but only *after* this
  // effect (registered later in this same component) has already run
  // once with that stale `null`. Deferring the redirect through a
  // cancelled-by-cleanup microtask lets that correction win the race:
  // if `signedOut` flips back to `false` on the very next render, cleanup
  // cancels the still-pending redirect before it fires.
  const identity = useKamIdentity()
  const signedOut = role === "kam" && identity === null
  React.useEffect(() => {
    if (!signedOut) return
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) router.replace("/admin/kam/login")
    })
    return () => {
      cancelled = true
    }
  }, [signedOut, router])

  const [sidebarOpen, setSidebarOpen] = useSidebarOpen(storageKey)

  // Every hook above must still run before this — the redirect itself is
  // fired from the effect above, this just skips the flash of an
  // unattributed console while that navigation is in flight.
  if (signedOut) return null

  const toggleSidebar = () => {
    setSidebarOpen((open) => !open)
  }

  return (
    <div className="h-dvh bg-card">
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
        <Link href={homeHref} className="text-xl font-bold tracking-tight text-amama-deep">
          amama
        </Link>
        <span className="hidden items-center gap-2 sm:flex">
          <span aria-hidden className="h-4 w-px bg-border" />
          <span className="text-[15px] font-medium text-muted-foreground">{content.label}</span>
        </span>

        <div className="ms-auto flex items-center gap-3">
          <LanguageSwitcher variant="inline" />
          <span
            className="grid size-10 place-items-center rounded-full bg-amama-deep text-[14px] font-semibold text-white shadow-floating"
            title={content.name ?? identity?.name}
          >
            <Icon className="size-4.5" />
          </span>
        </div>
      </header>

      <div className="relative flex h-full overflow-hidden md:gap-4">
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

        <div
          className={cn(
            "fixed inset-y-0 start-0 z-40 min-w-0 overflow-hidden md:static md:inset-auto md:z-auto md:shrink-0",
            "transition-[width] duration-300 ease-out",
            sidebarOpen ? "w-72" : cn("w-0", RAIL_WIDTH_MD)
          )}
        >
          <div
            className={cn(
              "h-full p-3 pt-20 transition-[width,transform] duration-300 ease-out md:pe-0",
              sidebarOpen ? "w-72" : cn("w-72", RAIL_WIDTH_MD),
              sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 rtl:translate-x-full md:rtl:translate-x-0"
            )}
          >
            <NavList
              items={adminNav[role]}
              expanded={sidebarOpen}
              onNavigate={() => {
                if (window.matchMedia("(max-width: 767px)").matches) {
                  setSidebarOpen(false)
                }
              }}
            />
          </div>
        </div>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full px-4 pt-20 pb-3 sm:px-6 md:ps-0">{children}</div>
        </main>
      </div>
    </div>
  )
}

export { AdminShell }
