"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { DirectionProvider } from "@/components/ui/direction"
import { LanguageSwitcher } from "@/features/i18n/components/language-switcher"
import { useI18n } from "@/features/i18n/i18n-context"

/**
 * The root `<html>` tag is rendered by the server layout and always ships
 * as `lang="en" dir="ltr"` — the safe default until the real preference is
 * read back from `localStorage` client-side. Once it is, this patches the
 * live `<html>` element directly rather than trying to re-render it, since
 * a nested client component can't replace an ancestor the server already
 * emitted.
 */
function I18nRoot({ children }: { children: React.ReactNode }) {
  const { locale } = useI18n()
  const pathname = usePathname()
  // The dashboard and the KAM console both have their own topbar with a
  // chip for this in the same corner — the fixed global switcher would
  // only sit on top of it there.
  const hasOwnSwitcher = pathname.includes("/dashboard") || pathname.startsWith("/kam")

  React.useEffect(() => {
    document.documentElement.lang = locale.tag
    document.documentElement.dir = locale.dir
  }, [locale])

  return (
    <DirectionProvider direction={locale.dir}>
      {children}
      {hasOwnSwitcher ? null : <LanguageSwitcher />}
    </DirectionProvider>
  )
}

export { I18nRoot }
