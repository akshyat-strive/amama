export type LocaleCode = "en" | "hi" | "mr" | "te" | "ta" | "gu" | "or" | "kn" | "ur"

export type Locale = {
  code: LocaleCode
  /** BCP-47 tag, used for `lang` and any `Intl` formatting. */
  tag: string
  dir: "ltr" | "rtl"
  /**
   * How this language's own name reads in a few other locales, keyed by
   * locale code. `nameIn[code]` is always present (the language's own
   * autonym, e.g. Hindi's own entry is "हिन्दी"), and `nameIn.en` is always
   * present too (its English name) — those two are what the dropdown needs
   * for the common case of switching to/from English. Filling in every
   * other locale's translation of every language name (9×9 combinations)
   * isn't realistic to do accurately by hand, so less common pairs (say,
   * Tamil's name while browsing in Odia) fall back to the English name
   * instead of guessing — see `nameFor` below.
   */
  nameIn: Partial<Record<LocaleCode, string>>
  /**
   * A short sample from this language's own script/alphabet — "Abc" for
   * Latin, "क ख ग" for Devanagari — kept for anywhere a compact glyph is
   * more useful than a full name (not the switcher's trigger, which shows
   * the language's own name instead — see `LanguageSwitcher`).
   */
  sample: string
  /** Whether choosing this language actually does anything yet. Only
   *  `"active"` locales have a real translation dictionary worth switching
   *  to right now — the rest exist in `translations/*.ts` (so nothing here
   *  breaks when one graduates) but show as disabled, "coming soon" rows
   *  in the switcher rather than silently landing on half-translated
   *  screens. */
  status: "active" | "comingSoon"
}

export const locales: Locale[] = [
  {
    code: "en",
    tag: "en",
    dir: "ltr",
    nameIn: { en: "English", hi: "अंग्रेज़ी", ur: "انگریزی" },
    sample: "Abc",
    status: "active",
  },
  {
    code: "hi",
    tag: "hi",
    dir: "ltr",
    nameIn: { en: "Hindi", hi: "हिन्दी", ur: "ہندی" },
    sample: "क ख ग",
    status: "active",
  },
  {
    code: "mr",
    tag: "mr",
    dir: "ltr",
    nameIn: { en: "Marathi", hi: "मराठी", mr: "मराठी" },
    sample: "क ख ग",
    status: "active",
  },
  {
    code: "te",
    tag: "te",
    dir: "ltr",
    nameIn: { en: "Telugu", hi: "तेलुगु", te: "తెలుగు" },
    sample: "క ఖ గ",
    status: "comingSoon",
  },
  {
    code: "ta",
    tag: "ta",
    dir: "ltr",
    nameIn: { en: "Tamil", hi: "तमिल", ta: "தமிழ்" },
    sample: "க ங ச",
    status: "comingSoon",
  },
  {
    code: "gu",
    tag: "gu",
    dir: "ltr",
    nameIn: { en: "Gujarati", hi: "गुजराती", gu: "ગુજરાતી" },
    sample: "ક ખ ગ",
    status: "comingSoon",
  },
  {
    code: "or",
    tag: "or",
    dir: "ltr",
    nameIn: { en: "Odia", hi: "ओड़िया", or: "ଓଡ଼ିଆ" },
    sample: "କ ଖ ଗ",
    status: "comingSoon",
  },
  {
    code: "kn",
    tag: "kn",
    dir: "ltr",
    nameIn: { en: "Kannada", hi: "कन्नड़", kn: "ಕನ್ನಡ" },
    sample: "ಕ ಖ ಗ",
    status: "comingSoon",
  },
  {
    code: "ur",
    tag: "ur",
    dir: "rtl",
    nameIn: { en: "Urdu", hi: "उर्दू", ur: "اردو" },
    sample: "ا ب پ",
    status: "comingSoon",
  },
]

export const defaultLocale: LocaleCode = "en"

export function getLocale(code: LocaleCode): Locale {
  return locales.find((locale) => locale.code === code) ?? locales[0]
}

export function isLocaleCode(value: string): value is LocaleCode {
  return locales.some((locale) => locale.code === value)
}

/** `locale`'s own name, as read in `inLocale` — falling back to its English
 *  name when that specific pair hasn't been filled in (see `nameIn` above). */
export function nameFor(locale: Locale, inLocale: LocaleCode): string {
  return locale.nameIn[inLocale] ?? locale.nameIn.en ?? locale.code
}
