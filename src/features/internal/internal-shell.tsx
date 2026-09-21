"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { PanelLeftIcon, SearchIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AccountMenu } from "@/features/dashboard/account-menu"
import { useSignOut } from "@/features/auth/use-sign-out"
import { useSidebarOpen } from "@/features/dashboard/sidebar-open-store"
import { useCurrentAdmin } from "@/features/admin/current-admin"
import { seedAdminDemoData } from "@/features/admin/seed-data"
import { PeekProvider } from "@/features/internal/peek-context"
import { PeekPanel } from "@/features/internal/peek-panel"
import {
  ActivityStrip,
  CommandPalette,
  ContextualRail,
  NotificationBell,
  PrimaryRail,
} from "@/features/internal/shell-parts"
import { sectionForPath, TOWER_SECTIONS } from "@/features/internal/tower-nav"

/**
 * The internal control tower's persistent frame.
 *
 * Five fixed parts, and every screen renders inside them:
 *   · a nine-icon primary rail that never changes
 *   · a contextual rail whose contents change completely per section
 *   · a top bar carrying global search and the notification bell
 *   · a right peek panel that any entity id anywhere can open
 *   · a bottom activity strip showing the last five events in the business
 *
 * The peek panel is the part that matters most. Without it these are
 * twelve separate screens; with it they are one record set you can walk
 * in any direction — a trade to its lots to the grower who supplied them
 * to every other trade that grower is in, without ever losing your place.
 */
function InternalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  // Same tri-state identity guard as the previous console shell:
  // `undefined` while /api/identity/me is in flight, `null` once it has
  // genuinely come back with no session. Redirect on `null` only, or a
  // real session gets bounced on every cold load.
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

  const [railOpen, setRailOpen] = useSidebarOpen("amama.internal.railOpen")
  const [paletteOpen, setPaletteOpen] = React.useState(false)
  const signOut = useSignOut("admin")

  // ⌘K / Ctrl-K anywhere opens search.
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setPaletteOpen((open) => !open)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const section = sectionForPath(pathname) ?? TOWER_SECTIONS[4]

  // Every hook above runs before this bail-out.
  if (loading || signedOut) return null

  return (
    <TooltipProvider>
      <PeekProvider>
        <div className="flex h-dvh flex-col gap-2 bg-card p-2 sm:p-3">
          <header className="flex h-12 shrink-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label={railOpen ? "Hide list" : "Show list"}
              aria-pressed={railOpen}
              onClick={() => setRailOpen((open) => !open)}
              className="shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <PanelLeftIcon className="size-[18px]" />
            </Button>

            <Link href="/internal/trades" className="text-xl font-bold tracking-tight text-amama-deep">
              amama
            </Link>
            <span className="hidden items-center gap-2 sm:flex">
              <span aria-hidden className="h-4 w-px bg-border" />
              <span className="font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
                Tradechain
              </span>
            </span>

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="ms-auto flex h-9 w-full max-w-xs items-center gap-2 rounded-full border border-border px-3.5 text-muted-foreground transition-colors hover:bg-muted"
            >
              <SearchIcon className="size-3.5 shrink-0" />
              <span className="truncate text-[13px]">Search everything</span>
              <kbd className="ms-auto hidden shrink-0 font-mono text-[10px] sm:block">⌘K</kbd>
            </button>

            <NotificationBell />
            <AccountMenu
              name={admin.user.name}
              subtitle={admin.role.name}
              profileHref="/internal/profile"
              settingsHref="/internal/settings"
              onSignOut={() => {
                void signOut()
              }}
            />
          </header>

          <div className="flex min-h-0 flex-1 gap-2 sm:gap-3">
            <div className="hidden shrink-0 md:block">
              <PrimaryRail activeId={section.id} />
            </div>

            <div
              className={cn(
                "hidden min-w-0 shrink-0 transition-[width] duration-200 lg:block",
                railOpen ? "w-[264px]" : "w-0 overflow-hidden"
              )}
            >
              <ContextualRail section={section} />
            </div>

            {/* Same ground as the sidebar rail — muted, faintly hatched —
                so the white islands the screens are built from read as
                the same material as the nav's own white item panels. */}
            <main className="min-w-0 flex-1 overflow-y-auto rounded-[24px] border border-border bg-muted bg-[repeating-linear-gradient(-45deg,var(--surface-border)_0px,var(--surface-border)_1px,transparent_1px,transparent_7px)]">
              <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-3 py-4 sm:px-4 sm:py-5">
                {children}
              </div>
            </main>
          </div>

          <ActivityStrip />
        </div>

        <PeekPanel />
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      </PeekProvider>
    </TooltipProvider>
  )
}

export { InternalShell }
