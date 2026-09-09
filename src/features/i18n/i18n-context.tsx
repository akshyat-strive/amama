"use client"

import * as React from "react"

import {
  defaultLocale,
  getLocale,
  isLocaleCode,
  type LocaleCode,
} from "@/features/i18n/locales"
import en, { type TranslationShape } from "@/features/i18n/translations/en"
import hi from "@/features/i18n/translations/hi"
import mr from "@/features/i18n/translations/mr"
import te from "@/features/i18n/translations/te"
import ta from "@/features/i18n/translations/ta"
import gu from "@/features/i18n/translations/gu"
import or_ from "@/features/i18n/translations/or"
import kn from "@/features/i18n/translations/kn"
import ur from "@/features/i18n/translations/ur"

const STORAGE_KEY = "amama.locale"

const dictionaries: Record<LocaleCode, TranslationShape> = {
  en,
  hi,
  mr,
  te,
  ta,
  gu,
  or: or_,
  kn,
  ur,
}

/*
 * Same external-store shape as `onboarding-context`: a language choice is
 * global UI state that has to be readable before React even mounts (the
 * very first paint should already be in the right language), so it lives
 * outside component state and is read through `useSyncExternalStore` rather
 * than `useState` + a restoring effect.
 *
 * `localStorage`, not `sessionStorage` — unlike an in-progress signup draft,
 * a language preference is something a person expects to carry across tabs
 * and future visits, not just this one session.
 */
let code: LocaleCode = defaultLocale
let restored = false
const listeners = new Set<() => void>()

function restoreOnce() {
  if (restored || typeof window === "undefined") return
  restored = true
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored && isLocaleCode(stored)) code = stored
  } catch {
    // Private mode or blocked storage — carry on with the default.
  }
}

function subscribe(listener: () => void) {
  restoreOnce()
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  restoreOnce()
  return code
}

function getServerSnapshot() {
  return defaultLocale
}

function write(next: LocaleCode) {
  code = next
  try {
    window.localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Persistence is best-effort.
  }
  listeners.forEach((listener) => listener())
}

/** Dot-path lookup ("onboarding.country.title") against a dictionary,
 *  falling back to English and then the path itself, so a translation
 *  that hasn't been written yet shows readable text instead of `undefined`. */
function resolve(path: string, dictionary: TranslationShape): string | undefined {
  let node: unknown = dictionary
  for (const segment of path.split(".")) {
    if (typeof node !== "object" || node === null) return undefined
    node = (node as Record<string, unknown>)[segment]
  }
  return typeof node === "string" ? node : undefined
}

function useI18n() {
  const active = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const locale = getLocale(active)

  return React.useMemo(() => {
    // `vars` fills in `{placeholders}` after the lookup — e.g.
    // t("onboarding.birthday.description", { minAge: 18 }) — so a
    // translator can freely reorder the placeholder within their sentence.
    const t = (path: string, vars?: Record<string, string | number>) => {
      const template =
        resolve(path, dictionaries[active]) ?? resolve(path, dictionaries[defaultLocale]) ?? path
      if (!vars) return template
      return template.replace(/\{(\w+)\}/g, (match, key) =>
        key in vars ? String(vars[key]) : match
      )
    }

    return { locale, setLocale: (next: LocaleCode) => write(next), t }
  }, [active, locale])
}

export { useI18n }
