"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LogOutIcon, SettingsIcon, UserRoundIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/** "Bisak Sharma" → "BS" — first letter of the first and last word. A
 *  single-word name (or a demo account like "Master Admin", which this
 *  still handles the same way) falls back to that word's own first two
 *  letters rather than leaving the second slot blank. */
function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return "?"
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

/**
 * The topbar avatar's own menu — who you are, and the two places that
 * identity actually leads: your profile, and the account-wide settings
 * (which is also where the Gold/Pro plans live). Signing out is the one
 * destructive action, so it's split off with a separator and the
 * destructive item styling rather than sitting flush with the other two.
 *
 * The avatar itself is a neutral, muted initials chip rather than a solid
 * brand-green fill — the brand color is for actions and accents elsewhere
 * in the topbar (the sidebar toggle, CTAs), not for a passive identity
 * badge that sits on screen at all times.
 *
 * Shared by every shell (buyer/seller `DashboardShell`, `AdminShell`)
 * rather than three copies of the same popover — only the identity fields
 * and hrefs differ per role, not the shape of the menu itself.
 */
function AccountMenu({
  name,
  subtitle,
  profileHref,
  settingsHref,
  onSignOut,
}: {
  name: string
  subtitle?: string | null
  profileHref: string
  settingsHref: string
  onSignOut: () => void
}) {
  const router = useRouter()
  const initials = initialsFor(name)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        title={name}
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-full bg-muted text-[13px] font-semibold text-foreground shadow-floating outline-none transition-colors hover:bg-muted/70",
          "focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-offset-2"
        )}
      >
        {initials}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56 p-1.5">
        <div className="flex items-center gap-3 px-2.5 py-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-[12px] font-semibold text-foreground">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-foreground">{name}</p>
            {subtitle ? <p className="truncate text-[12px] text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => router.push(profileHref)}>
          <UserRoundIcon />
          View profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(settingsHref)}>
          <SettingsIcon />
          Settings
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem variant="destructive" onClick={onSignOut}>
          <LogOutIcon />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { AccountMenu }
