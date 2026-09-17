"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeftIcon, PackageSearchIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cropLabels } from "@/features/dashboard/demo-data"
import { convertToUsd, currencies, inrToUsd, suggestRoundedUsd, usdToInr } from "@/features/marketplace/currency"
import { logListingChange } from "@/features/marketplace/conversation-store"
import { GradeInfoTrigger } from "@/features/marketplace/grade-badge"
import {
  addListing,
  updateListing,
  useListings,
} from "@/features/marketplace/listing-store"
import { LocationPicker } from "@/features/marketplace/location-picker"
import { sellerIdentity } from "@/features/marketplace/identity"
import { CountryCombobox } from "@/features/onboarding/components/country-select"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import { crops } from "@/features/onboarding/steps"

const gradeOptions = ["Grade A+", "Grade A", "Grade B"]

type FormState = {
  cropId: string
  variety: string
  grade: string
  quantityMt: string
  currency: string
  localPrice: string
  /** What buyers actually see, in rupees — converted to the stored USD
   *  figure only at submit time (see `handleSubmit`). */
  inrPrice: string
  country: string
  region: string
  description: string
  pinX: number
  pinY: number
}

/**
 * The "add a listing" surface — a full page rather than a dialog, since a
 * seller placing their farm on a map and working out a rupee price from
 * their own currency needs room, not a 480px popup. Doubles as the edit
 * form: same fields, pre-filled from the existing listing, the only real
 * difference being what happens on submit.
 */
function ListingFormView({ listingId }: { listingId?: string }) {
  const router = useRouter()
  const { draft } = useOnboarding()
  const seller = sellerIdentity(draft.seller)
  const listings = useListings()
  const editing = listingId ? listings.find((entry) => entry.id === listingId) : undefined

  const [form, setForm] = React.useState<FormState>(() => {
    if (editing) {
      const inrPrice = String(Math.round(usdToInr(editing.pricePerTonneUsd)))
      return {
        cropId: editing.cropId,
        variety: editing.variety,
        grade: editing.grade,
        quantityMt: String(editing.quantityMt),
        currency: "INR",
        localPrice: inrPrice,
        inrPrice,
        country: editing.country,
        region: editing.region,
        description: editing.description,
        pinX: editing.pinX,
        pinY: editing.pinY,
      }
    }
    return {
      cropId: crops[0].id,
      variety: "",
      grade: gradeOptions[0],
      quantityMt: "",
      currency: "INR",
      localPrice: "",
      inrPrice: "",
      country: draft.seller.country,
      region: draft.seller.region,
      description: "",
      pinX: 50,
      pinY: 50,
    }
  })
  const [submitError, setSubmitError] = React.useState<string | null>(null)

  if (listingId && !editing) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border py-16 text-center">
        <PackageSearchIcon className="size-6 text-muted-foreground" />
        <p className="text-[15px] font-semibold">This listing no longer exists</p>
        <Link href="/seller/dashboard/listings" className="text-[13px] font-medium text-amama-deep underline">
          Back to your catalog
        </Link>
      </div>
    )
  }

  const patchForm = (patch: Partial<FormState>) => setForm((previous) => ({ ...previous, ...patch }))

  // The seller can type in whatever currency they think in; what lands in
  // "Listing price" — and what actually gets stored — is always the
  // rupee-rounded USD equivalent, since that's the one figure every other
  // screen in the app (marketplace, deals, contracts) is built around.
  const suggestInrPrice = (amount: number, currency: string) =>
    Number.isFinite(amount) && amount > 0
      ? String(Math.round(usdToInr(suggestRoundedUsd(convertToUsd(amount, currency)))))
      : ""

  const onLocalPriceChange = (value: string) => {
    const suggested = suggestInrPrice(Number(value), form.currency)
    patchForm({ localPrice: value, inrPrice: suggested === "" ? "" : suggested })
  }

  const onCurrencyChange = (currency: string) => {
    const suggested = suggestInrPrice(Number(form.localPrice), currency)
    patchForm({ currency, inrPrice: suggested === "" ? "" : suggested })
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    // Validated on submit rather than behind a silently-disabled button —
    // a button that just never lights up gives no clue which field is the
    // problem (country defaulting to empty for an incomplete onboarding
    // profile was the usual culprit).
    const missing: string[] = []
    if (!form.variety.trim()) missing.push("variety")
    if (!(Number(form.quantityMt) > 0)) missing.push("quantity")
    if (!(Number(form.inrPrice) > 0)) missing.push("price")
    if (!form.country) missing.push("country")
    if (missing.length > 0) {
      setSubmitError(`Fill in ${missing.join(", ")} before ${editing ? "saving" : "publishing"}.`)
      return
    }
    setSubmitError(null)

    const cropPhoto = crops.find((crop) => crop.id === form.cropId)?.photo ?? crops[0].photo

    const payload = {
      cropId: form.cropId,
      variety: form.variety.trim(),
      grade: form.grade,
      quantityMt: Number(form.quantityMt),
      pricePerTonneUsd: Math.round(inrToUsd(Number(form.inrPrice))),
      country: form.country,
      region: form.region.trim(),
      description: form.description.trim(),
      photo: cropPhoto,
      pinX: form.pinX,
      pinY: form.pinY,
    }

    if (editing) {
      const result = updateListing(editing.id, payload)
      if (result) {
        const changedSomething =
          result.before.variety !== result.after.variety ||
          result.before.grade !== result.after.grade ||
          result.before.quantityMt !== result.after.quantityMt ||
          result.before.pricePerTonneUsd !== result.after.pricePerTonneUsd ||
          result.before.region !== result.after.region ||
          result.before.description !== result.after.description
        if (changedSomething) {
          logListingChange(editing.id, `${seller.name} updated this listing`, result)
        }
      }
      router.push(`/seller/dashboard/listings/${editing.id}`)
      return
    }

    const listing = addListing({ sellerId: seller.id, sellerName: seller.name, ...payload })
    router.push(`/seller/dashboard/listings/${listing.id}`)
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href={editing ? `/seller/dashboard/listings/${editing.id}` : "/seller/dashboard/listings"}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" />
        {editing ? "Back to listing" : "Your catalog"}
      </Link>

      <h1 className="mt-3 text-[28px] font-bold tracking-tight">
        {editing ? "Edit listing" : "Add a listing"}
      </h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <FormSection title="Product">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
              Crop
              <Select value={form.cropId} onValueChange={(value) => patchForm({ cropId: value as string })}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(value) => cropLabels[value as string] ?? (value as string)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {crops.map((crop) => (
                    <SelectItem key={crop.id} value={crop.id}>
                      {cropLabels[crop.id] ?? crop.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
              <span className="flex items-center gap-1.5">
                Grade
                <GradeInfoTrigger grade={form.grade} />
              </span>
              <Select value={form.grade} onValueChange={(value) => patchForm({ grade: value as string })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {gradeOptions.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>

          <label className="mt-3 flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
            Variety
            <Input
              value={form.variety}
              onChange={(event) => patchForm({ variety: event.target.value })}
              placeholder="e.g. Bhagwa Pomegranate"
            />
          </label>

          <label className="mt-3 flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
            Quantity (MT)
            <Input
              type="number"
              min={1}
              value={form.quantityMt}
              onChange={(event) => patchForm({ quantityMt: event.target.value })}
              placeholder="20"
            />
          </label>

          <label className="mt-3 flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
            Quality &amp; details
            <Textarea
              value={form.description}
              onChange={(event) => patchForm({ description: event.target.value })}
              placeholder="Grading, processing, certifications, anything a buyer would ask about."
              rows={3}
            />
          </label>
        </FormSection>

        <FormSection
          title="Price"
          subtitle="Price it in your own currency — we'll suggest a rounded listing price in rupees, since that's what buyers see."
        >
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
              Currency
              <Select value={form.currency} onValueChange={(value) => onCurrencyChange(value as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value) => currencies.find((entry) => entry.code === value)?.label ?? (value as string)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((entry) => (
                    <SelectItem key={entry.code} value={entry.code}>
                      {entry.code} — {entry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
              Your price / tonne
              <Input
                type="number"
                min={1}
                value={form.localPrice}
                onChange={(event) => onLocalPriceChange(event.target.value)}
                placeholder="66000"
              />
            </label>
          </div>
          <label className="mt-3 flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
            Listing price (₹ / tonne)
            <Input
              type="number"
              min={1}
              value={form.inrPrice}
              onChange={(event) => patchForm({ inrPrice: event.target.value })}
              placeholder="66400"
            />
          </label>
        </FormSection>

        <FormSection title="Location">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
              Country
              <CountryCombobox
                value={form.country}
                onValueChange={(value) => patchForm({ country: value })}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
              Region
              <Input
                value={form.region}
                onChange={(event) => patchForm({ region: event.target.value })}
                placeholder="e.g. Nashik, Maharashtra"
              />
            </label>
          </div>

          <p className="mt-4 text-[13px] font-medium text-foreground">Roughly where you are</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Drag to look around, zoom to get closer, tap to drop the pin — this stays a
            general area on the buyer&apos;s side, never an exact address, so no one can
            use it to meet outside the platform.
          </p>
          <LocationPicker
            country={form.country}
            region={form.region}
            pinX={form.pinX}
            pinY={form.pinY}
            onPick={(x, y) => patchForm({ pinX: x, pinY: y })}
            className="mt-2 aspect-video w-full rounded-2xl"
          />
        </FormSection>

        <div className="flex flex-col items-start gap-2">
          <Button type="submit" size="lg">
            {editing ? "Save changes" : "Publish listing"}
          </Button>
          {submitError ? <p className="text-[13px] font-medium text-destructive">{submitError}</p> : null}
        </div>
      </form>
    </div>
  )
}

/** One labelled group of related fields — the same bordered-card treatment
 *  the price fields already had, now applied consistently across the whole
 *  form so a seller can see at a glance which fields belong together
 *  instead of reading one long unbroken list of labels. */
function FormSection({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[13px] font-semibold text-foreground">{title}</p>
      {subtitle ? <p className="mt-0.5 text-[12px] text-muted-foreground">{subtitle}</p> : null}
      <div className="mt-3">{children}</div>
    </div>
  )
}

export { ListingFormView }
