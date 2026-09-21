"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChartNoAxesGantt } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { AccountMenu } from "@/features/dashboard/account-menu"
import { useSignOut } from "@/features/auth/use-sign-out"
import { LanguageSwitcher } from "@/features/i18n/components/language-switcher"
import { NavList } from "@/features/dashboard/nav-list"
import { useSidebarOpen } from "@/features/dashboard/sidebar-open-store"
import { visibleAdminNav } from "@/features/admin/admin-nav-config"
import { useCurrentAdmin } from "@/features/admin/current-admin"
import { seedAdminDemoData } from "@/features/admin/seed-data"
import { FullPageLoader } from "@/components/ui/full-page-loader"

/** Same rail-width constant and rationale as `DashboardShell` — see there
 *  for why one `sidebarOpen` boolean resolves to three different visual
 *  states across the two breakpoints. */
const RAIL_WIDTH_MD = "md:w-[66px]"

/**
 * The admin module's own shell — same popover-sidebar-over-flat-canvas shape
 * as the buyer/seller dashboards (`DashboardShell`), so moving between "what
 * does the applicant-facing app look like" and "my own queue" isn't context-
 * switching between two different products. One shell for every business-
 * side role now (not forked per role) — the only things that change are the
 * nav items (filtered by permission) and the topbar identity chip.
 *
 * Kept as its own component rather than reusing `DashboardShell` directly:
 * that one is wired to an onboarding-draft identity (a buyer or seller's own
 * name), and admin staff have neither — just a signed-in `AdminUser`.
 */
function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  // A signed-in identity is required to attribute every moderation/
  // verification/deal action to someone real — a route with nobody signed
  // in has nowhere to attribute an action to. Bounce back to sign-in
  // rather than letting the console render with no identity.
  //
  // `useCurrentAdmin` is `undefined` while its `/api/identity/me` fetch is
  // still in flight (every fresh page load, not just a one-tick hydration
  // race) and only settles to `null` once that call has genuinely come
  // back with no admin session — the redirect below fires on that `null`,
  // never on the loading state, so it doesn't bounce a real session back
  // to `/login` just because the network round-trip hasn't finished yet.
  const admin = useCurrentAdmin()
  const loading = admin === undefined
  const signedOut = admin === null
  React.useEffect(() => {
    if (loading || !signedOut) return
    router.replace("/internal/login")
  }, [loading, signedOut, router])

  React.useEffect(() => {
    if (admin) seedAdminDemoData()
  }, [admin])

  const [sidebarOpen, setSidebarOpen] = useSidebarOpen("amama.admin.sidebarOpen")
  const signOut = useSignOut("admin")

  // Every hook above must still run before this — the redirect itself is
  // fired from the effect above, this just skips rendering a console with
  // no identity while that's still being sorted out. `loading` gets a
  // spinner rather than nothing, since it's the one branch that can take
  // a real network round-trip (right after a quick-login redirect, say) —
  // `signedOut` is about to navigate away, so there's nothing worth
  // showing there.
  if (loading) return <FullPageLoader />
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
        <Link href="/internal" className="text-xl font-bold tracking-tight text-amama-deep">
          amama
        </Link>
        <span className="hidden items-center gap-2 sm:flex">
          <span aria-hidden className="h-4 w-px bg-border" />
          <span className="text-[15px] font-medium text-muted-foreground">{admin.role.name}</span>
        </span>

        <div className="ms-auto flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher variant="inline" />
          <AccountMenu
            name={admin.user.name}
            subtitle={admin.role.name}
            profileHref="/internal/profile"
            settingsHref="/internal/settings"
            onSignOut={() => {
              void signOut()
            }}
          />
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
              items={visibleAdminNav(admin.can)}
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
