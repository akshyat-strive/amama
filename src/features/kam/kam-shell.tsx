"use client"

import * as React from "react"
import Link from "next/link"
import { ChartNoAxesGantt, ShieldCheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LanguageSwitcher } from "@/features/i18n/components/language-switcher"
import { NavList } from "@/features/dashboard/nav-list"
import { KAM_NAME } from "@/features/marketplace/kam-thread-store"
import { kamNav } from "@/features/kam/kam-nav-config"

const SIDEBAR_STORAGE_KEY = "amama.kamSidebarOpen"
const TOPBAR_OFFSET = "pt-20"

/**
 * The KAM console's own shell — same popover-sidebar-over-flat-canvas shape
 * as the buyer/seller dashboards (`DashboardShell`), so a KAM moving
 * between "what does the applicant-facing app look like" and "my own
 * queue" isn't context-switching between two different products. Kept as
 * its own component rather than reusing `DashboardShell` directly: that
 * one is wired to an onboarding-draft identity (a buyer or seller's own
 * name), and a KAM has neither — just a fixed staff identity.
 */
function KamShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(() => {
    if (typeof window === "undefined") return true
    try {
      return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) !== "0"
    } catch {
      return true
    }
  })

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
        <Link href="/kam" className="text-xl font-bold tracking-tight text-amama-deep">
          amama
        </Link>
        <span className="hidden items-center gap-2 sm:flex">
          <span aria-hidden className="h-4 w-px bg-border" />
          <span className="text-[15px] font-medium text-muted-foreground">KAM</span>
        </span>

        <div className="ms-auto flex items-center gap-3">
          <LanguageSwitcher variant="inline" />
          <span
            className="grid size-10 place-items-center rounded-full bg-amama-deep text-[14px] font-semibold text-white shadow-floating"
            title={KAM_NAME}
          >
            <ShieldCheckIcon className="size-4.5" />
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
            sidebarOpen ? "w-72" : "w-0"
          )}
        >
          <div
            className={cn(
              "h-full w-72 p-3 transition-transform duration-300 ease-out md:pe-0",
              TOPBAR_OFFSET,
              sidebarOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full"
            )}
          >
            <div className="flex h-full flex-col rounded-3xl bg-[#0a0a0a] p-3 shadow-lg ring-1 ring-black/20">
              <NavList
                items={kamNav}
                onNavigate={() => {
                  if (window.matchMedia("(max-width: 767px)").matches) {
                    setSidebarOpen(false)
                  }
                }}
              />
            </div>
          </div>
        </div>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className={cn("mx-auto w-full px-4 pb-3 sm:px-6 md:ps-0", TOPBAR_OFFSET)}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export { KamShell }
