"use client"

import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
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
 * trigger shows the current language's own name ("English", "हिन्दी"), so
 * it reads as a label for what's active rather than an unlabelled icon.
 *
 * Every locale in `locales.ts` is listed, not just `"active"` ones — a
 * language someone is waiting on should be visible ("here's what's coming"),
 * not silently absent. `"comingSoon"` rows render disabled with a small
 * badge instead of being filtered out, since there's no translation
 * dictionary worth switching to yet — see the `status` field's own doc
 * comment in `locales.ts`.
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
          buttonVariants({ variant: "outline", size: "sm" }),
          "border-transparent bg-card font-medium shadow-floating hover:bg-muted",
          variant === "fixed" && "fixed end-3 top-3 z-50 border-border/60 bg-card/90 shadow-sm backdrop-blur-sm"
        )}
      >
        {nameFor(locale, locale.code)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48 p-1">
        {locales.map((option) => {
          const selected = option.code === locale.code
          const comingSoon = option.status === "comingSoon"
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
              disabled={comingSoon}
              onClick={() => !comingSoon && setLocale(option.code)}
              className="justify-between gap-2 py-2"
            >
              <span className={cn("min-w-0 truncate text-[13px] font-semibold", comingSoon ? "text-muted-foreground" : "text-foreground")}>
                {native}
                {showTranslation ? (
                  <span className="font-normal text-muted-foreground"> / {inActiveLocale}</span>
                ) : null}
              </span>
              {comingSoon ? (
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Soon
                </span>
              ) : (
                <CheckIcon
                  className={cn(
                    "size-3.5 shrink-0 text-amama-deep transition-opacity",
                    selected ? "opacity-100" : "opacity-0"
                  )}
                  strokeWidth={3}
                />
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { LanguageSwitcher }
