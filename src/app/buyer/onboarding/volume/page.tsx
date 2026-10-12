"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowDownIcon, ArrowRightIcon, ArrowUpIcon, PlusIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useI18n } from "@/features/i18n/i18n-context"
import { productLabel, slugify } from "@/features/marketplace/catalog"
import { IncotermInfoButton } from "@/features/marketplace/incoterm-picker"
import { useListings } from "@/features/marketplace/listing-store"
import { StepShell } from "@/features/onboarding/components/step-shell"
import { SelectableGroup, SelectableRow } from "@/features/onboarding/components/selectable"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import {
  ORDER_SIZE_LABELS,
  effectiveSteps,
  gradeSuggestions,
  incoterms,
  isCatalogCrop,
  nextStep,
  orderSizes,
  previousStep,
  stepIndex,
} from "@/features/onboarding/steps"
import type { BuyerPreferences } from "@/features/onboarding/types"

/** `useSearchParams` (for the marketplace's "Edit preferences" deep link)
 *  needs a Suspense boundary to keep the route statically renderable. */
export default function BuyerPreferencesPage() {
  return (
    <React.Suspense fallback={null}>
      <BuyerPreferences />
    </React.Suspense>
  )
}

type Option = { id: string; label: string }

/**
 * Preferences, not commitments. Two optional priority lists — which
 * products or variants to show first, and which grades — plus a usual
 * order size and incoterm. None of it filters anything out of the
 * marketplace; it only decides the order things appear in.
 */
function BuyerPreferences() {
  const router = useRouter()
  const { t } = useI18n()
  const { draft, updateBuyer } = useOnboarding()
  const buyer = draft.buyer
  const preferences = buyer.preferences
  const listings = useListings()

  const fromMarketplace = useSearchParams().get("from") === "marketplace"
  const target = nextStep("buyer", "volume", buyer.entityType)
  const back = previousStep("buyer", "volume", buyer.entityType)
  const continueHref = fromMarketplace ? "/buyer/dashboard/sourcing" : target?.href

  const nameOf = React.useCallback(
    (cropId: string) => (isCatalogCrop(cropId) ? t(`onboarding.options.crops.${cropId}`) : productLabel(cropId)),
    [t]
  )

  /** The buyer's products, and every variant sellers list for them. */
  const productOptions: Option[] = React.useMemo(() => {
    const options: Option[] = []
    for (const cropId of buyer.sourcing) {
      options.push({ id: cropId, label: nameOf(cropId) })
      const varieties = new Map<string, string>()
      for (const listing of listings) {
        if (listing.cropId === cropId && listing.variety && !listing.deletedAt) varieties.set(slugify(listing.variety), listing.variety)
      }
      for (const [slug, variety] of varieties) options.push({ id: `${cropId}/${slug}`, label: `${nameOf(cropId)} · ${variety}` })
    }
    return options
  }, [buyer.sourcing, listings, nameOf])

  const labelForProduct = (id: string) => {
    const known = productOptions.find((option) => option.id === id)
    if (known) return known.label
    const [cropId, variant] = id.split("/")
    return variant ? `${nameOf(cropId)} · ${productLabel(variant)}` : nameOf(cropId)
  }

  const set = (patch: Partial<BuyerPreferences>) => updateBuyer((previous) => ({ preferences: { ...previous.preferences, ...patch } }))

  return (
    <StepShell
      step={stepIndex("buyer", "volume", buyer.entityType) + 1}
      totalSteps={effectiveSteps("buyer", buyer.entityType).length}
      backHref={fromMarketplace ? "/buyer/dashboard/sourcing" : (back?.href ?? "/")}
      title={t("onboarding.volume.title")}
      description="Everything here is optional. We show what matches first — nothing is hidden."
      skipHref={continueHref}
      footer={
        <Button size="xl" className="w-full" onClick={() => continueHref && router.push(continueHref)}>
          {t("common.continue")}
          <ArrowRightIcon />
        </Button>
      }
    >
      <div className="flex flex-col gap-9">
        <PriorityList
          title="Products to show first"
          hint="Pick products or specific variants, most wanted first."
          items={preferences.products.map((id) => ({ id, label: labelForProduct(id) }))}
          suggestions={productOptions.filter((option) => !preferences.products.includes(option.id))}
          onChange={(ids) => set({ products: ids })}
          emptySuggestions="Pick what you source first — your products and their variants appear here."
        />

        <PriorityList
          title="Grades to show first"
          hint="Most wanted first. Add your own if it isn't here."
          items={preferences.grades.map((grade) => ({ id: grade, label: grade }))}
          suggestions={gradeSuggestions(buyer.sourcing)
            .filter((grade) => !preferences.grades.includes(grade))
            .map((grade) => ({ id: grade, label: grade }))}
          onChange={(ids) => set({ grades: ids })}
          allowCustom="Add a grade"
        />

        <fieldset>
          <legend className="text-[14px] font-semibold">Usual order size</legend>
          <div role="radiogroup" aria-label="Usual order size" className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {orderSizes.map((size) => {
              const on = preferences.orderSize === size
              return (
                <button
                  key={size}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => set({ orderSize: on ? "" : size })}
                  className={cn(
                    "h-11 rounded-2xl border text-[14px] font-medium transition-colors",
                    on ? "border-amama-deep bg-amama-subtle text-amama-deep" : "border-border bg-card text-foreground hover:bg-muted"
                  )}
                >
                  {ORDER_SIZE_LABELS[size]}
                </button>
              )
            })}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 flex items-center gap-1.5 text-[14px] font-semibold">
            {t("onboarding.volume.incotermLegend")}
            <IncotermInfoButton />
          </legend>
          <SelectableGroup>
            {incoterms.map((term) => (
              <SelectableRow
                key={term}
                name="incoterm"
                label={t(`onboarding.options.incoterms.${term}`)}
                selected={buyer.incoterm === term}
                onSelect={() => updateBuyer({ incoterm: term })}
              />
            ))}
          </SelectableGroup>
        </fieldset>
      </div>
    </StepShell>
  )
}

/** An ordered list the buyer builds from suggestions (or their own
 *  entries) and reorders with up / down — the first item matters most. */
function PriorityList({
  title,
  hint,
  items,
  suggestions,
  onChange,
  allowCustom,
  emptySuggestions,
}: {
  title: string
  hint: string
  items: Option[]
  suggestions: Option[]
  onChange: (ids: string[]) => void
  allowCustom?: string
  emptySuggestions?: string
}) {
  const [custom, setCustom] = React.useState("")
  const ids = items.map((item) => item.id)
  const move = (index: number, by: number) => {
    const next = [...ids]
    const [item] = next.splice(index, 1)
    next.splice(index + by, 0, item)
    onChange(next)
  }
  const addCustom = () => {
    const value = custom.trim()
    if (value.length < 1 || ids.includes(value)) return
    onChange([...ids, value])
    setCustom("")
  }

  return (
    <section aria-label={title}>
      <h2 className="text-[14px] font-semibold">{title}</h2>
      <p className="mt-0.5 text-[13px] text-muted-foreground">{hint}</p>

      {items.length > 0 ? (
        <ol className="mt-3 flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
          {items.map((item, index) => (
            <li key={item.id} className="flex items-center gap-2 border-b border-border px-3 py-2 last:border-b-0">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-amama-subtle text-[12px] font-semibold text-amama-deep tabular-nums">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{item.label}</span>
              <IconButton label={`Move ${item.label} up`} disabled={index === 0} onClick={() => move(index, -1)}>
                <ArrowUpIcon className="size-4" />
              </IconButton>
              <IconButton label={`Move ${item.label} down`} disabled={index === items.length - 1} onClick={() => move(index, 1)}>
                <ArrowDownIcon className="size-4" />
              </IconButton>
              <IconButton label={`Remove ${item.label}`} onClick={() => onChange(ids.filter((id) => id !== item.id))}>
                <XIcon className="size-4" />
              </IconButton>
            </li>
          ))}
        </ol>
      ) : null}

      {suggestions.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange([...ids, option.id])}
              className="inline-flex h-9 items-center gap-1 rounded-full border border-border bg-card px-3 text-[13.5px] font-medium text-foreground transition-colors hover:bg-muted"
            >
              <PlusIcon aria-hidden className="size-3.5 text-muted-foreground" />
              {option.label}
            </button>
          ))}
        </div>
      ) : emptySuggestions && items.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-border px-4 py-4 text-[13px] text-muted-foreground">{emptySuggestions}</p>
      ) : null}

      {allowCustom ? (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            addCustom()
          }}
        >
          <label className="sr-only" htmlFor={`custom-${slugify(title)}`}>
            {allowCustom}
          </label>
          <Input id={`custom-${slugify(title)}`} value={custom} onChange={(event) => setCustom(event.target.value)} placeholder={allowCustom} className="h-10 rounded-2xl" />
          <button
            type="submit"
            disabled={!custom.trim()}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-2xl border border-border bg-card px-4 text-[13.5px] font-semibold transition-colors hover:bg-muted disabled:opacity-40"
          >
            <PlusIcon aria-hidden className="size-4" />
            Add
          </button>
        </form>
      ) : null}
    </section>
  )
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
    >
      {children}
    </button>
  )
}
