"use client"

import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useI18n } from "@/features/i18n/i18n-context"
import { locales, nameFor } from "@/features/i18n/locales"

/**
 * Fixed in the same corner on every screen that doesn't already have its own
 * chrome to put it in — login, onboarding — because a language choice needs
 * to be visible before anyone reads anything else in the wrong language. The
 * trigger itself is almost no text at all: just `[code]` in the app's mono
 * font, so it reads as a quiet utility control rather than competing with
 * the page underneath it.
 *
 * The dashboard topbar has its own row of floating chips for this exact
 * purpose, so it renders this with `variant="inline"` instead of letting the
 * fixed corner version stack on top of the account avatar sitting in that
 * same corner.
 */
function LanguageSwitcher({
  variant = "fixed",
}: {
  variant?: "fixed" | "inline"
}) {
  const { locale, setLocale, t } = useI18n()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("language.trigger")}
        lang={locale.tag}
        className={cn(
          "cursor-pointer rounded-full text-[13px] font-medium text-foreground outline-none transition-colors",
          "focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-offset-2",
          variant === "fixed"
            ? "fixed end-3 top-3 z-50 border border-border/60 bg-card/90 px-3 py-1.5 shadow-sm backdrop-blur-sm hover:bg-muted"
            : "bg-card px-3 py-1.5 shadow-floating hover:bg-muted"
        )}
      >
        {locale.sample}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40 p-1">
        {locales.map((option) => {
          const selected = option.code === locale.code
          // Every language's own name, written in its own script first —
          // "हिन्दी", not "Hindi" — so someone can recognise their own
          // language even before they can read the Latin alphabet. The
          // second half says the same name in whichever language is
          // currently active ("/ Hindi" while browsing in English), so the
          // row is legible from *both* sides of a language switch. When the
          // two would be identical (always true for whichever language is
          // already active) the slash is dropped instead of repeating it.
          const native = nameFor(option, option.code)
          const inActiveLocale = nameFor(option, locale.code)
          const showTranslation = inActiveLocale !== native

          return (
            <DropdownMenuItem
              key={option.code}
              onClick={() => setLocale(option.code)}
              className="justify-between gap-2 py-2"
            >
              <span className="min-w-0 truncate text-[13px] font-semibold text-foreground">
                {native}
                {showTranslation ? (
                  <span className="font-normal text-muted-foreground"> / {inActiveLocale}</span>
                ) : null}
              </span>
              <CheckIcon
                className={cn(
                  "size-3.5 shrink-0 text-amama-deep transition-opacity",
                  selected ? "opacity-100" : "opacity-0"
                )}
                strokeWidth={3}
              />
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { LanguageSwitcher }
