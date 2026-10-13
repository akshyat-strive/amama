"use client"

import * as React from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { useI18n } from "@/features/i18n/i18n-context"
import { productLabel } from "@/features/marketplace/catalog"
import { countries, countryCodeToFlag } from "@/features/onboarding/countries"
import { pickedKeys, pickLabel } from "@/features/onboarding/interests"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import { ORDER_SIZE_LABELS, cropImageUrl, crops, isCatalogCrop } from "@/features/onboarding/steps"
import type { OnboardingRole } from "@/features/onboarding/types"

type Photo = { id: string; alt: string; credit?: { name: string; profileUrl: string } }

const cropPhoto = (id: string, alt: string): Photo => {
  const crop = crops.find((entry) => entry.id === id)
  return { id: crop?.photo ?? crops[0].photo, alt, credit: crop && "credit" in crop ? crop.credit : undefined }
}

/** One photo per step, so moving through the flow feels like moving. */
const PHOTOS: Record<OnboardingRole, Photo[]> = {
  buyer: [
    {
      id: "photo-1601897690942-bcacbad33e55",
      alt: "Shipping containers stacked at a port, cranes overhead",
      credit: { name: "Paul .T", profileUrl: "https://unsplash.com/@hooverpaul55" },
    },
    cropPhoto("coffee", "Roasted coffee beans"),
    cropPhoto("cocoa", "Cocoa pods and beans"),
    cropPhoto("spices", "Bowls of ground spices"),
    cropPhoto("tea", "Tea leaves"),
    cropPhoto("grains", "Grain in the field"),
    cropPhoto("cashew", "Cashew nuts"),
  ],
  seller: [
    {
      id: "photo-1620901433789-1d2f85a93653",
      alt: "A farmer ploughing a field with two oxen",
      credit: { name: "Saikiran Kesari", profileUrl: "https://unsplash.com/@saikirankesari" },
    },
    cropPhoto("tea", "Tea leaves"),
    cropPhoto("grains", "Grain in the field"),
    cropPhoto("coffee", "Roasted coffee beans"),
    cropPhoto("spices", "Bowls of ground spices"),
    cropPhoto("pulses", "Pulses"),
    cropPhoto("cocoa", "Cocoa pods and beans"),
  ],
}

/**
 * The right half of every onboarding step on a desktop: a full-height
 * photo with a live preview of the profile being built — what the other
 * side of the marketplace will see — filling in as each field is answered.
 */
function OnboardingAside({ step, className }: { step: number; className?: string }) {
  const role: OnboardingRole = usePathname().startsWith("/seller") ? "seller" : "buyer"
  const photos = PHOTOS[role]
  const photo = photos[(Math.max(step, 1) - 1) % photos.length]

  return (
    <aside className={cn("hidden lg:block", className)}>
      <div className="relative h-full overflow-hidden bg-muted">
        <Image
          key={photo.id}
          src={cropImageUrl(photo.id, 1400)}
          alt={photo.alt}
          fill
          priority
          sizes="43vw"
          className="animate-in object-cover duration-700 fade-in"
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-black/10" />
        {photo.credit ? (
          <a
            href={photo.credit.profileUrl}
            target="_blank"
            rel="noreferrer"
            className="absolute start-6 top-6 rounded-full bg-black/30 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm transition-colors hover:bg-black/50 hover:text-white"
          >
            Photo: {photo.credit.name} / Unsplash
          </a>
        ) : null}
        <div className="absolute inset-x-10 bottom-10 xl:inset-x-14 xl:bottom-14">
          <ProfilePreview role={role} />
          <p className="mt-3 text-[13px] text-white/85">{role === "buyer" ? "How sellers will see you" : "How buyers will see you"}</p>
        </div>
      </div>
    </aside>
  )
}

function ProfilePreview({ role }: { role: OnboardingRole }) {
  const { t } = useI18n()
  const { draft } = useOnboarding()
  const nameOf = (id: string) => (isCatalogCrop(id) ? t(`onboarding.options.crops.${id}`) : productLabel(id))

  const person = role === "buyer" ? draft.buyer : draft.seller
  const country = countries.find((entry) => entry.code === person.country)
  const place = country ? `${countryCodeToFlag(country.code)} ${country.name}` : ""

  let title: string
  let subtitle: string[]
  let chips: string[]
  let facts: { label: string; value: string }[]
  let bio = ""

  if (role === "buyer") {
    const buyer = draft.buyer
    title = buyer.companyName || buyer.fullName
    subtitle = [buyer.companyName ? buyer.fullName : "", buyer.businessType ? t(`onboarding.options.businessTypes.${buyer.businessType}`) : "", place]
    chips = pickedKeys(buyer).map((key) => pickLabel(key, nameOf))
    facts = [
      { label: "Usual order", value: buyer.preferences.orderSize ? ORDER_SIZE_LABELS[buyer.preferences.orderSize as keyof typeof ORDER_SIZE_LABELS] : "" },
      { label: "Incoterm", value: buyer.incoterm ? t(`onboarding.options.incoterms.${buyer.incoterm}`) : "" },
    ]
  } else {
    const seller = draft.seller
    title = seller.farmName || seller.fullName
    subtitle = [seller.farmName ? seller.fullName : "", seller.region, place]
    chips = [
      ...seller.produce.map(nameOf),
      ...seller.certifications.filter((id) => id !== "none").map((id) => t(`onboarding.options.certifications.${id}.label`)),
    ]
    facts = [
      { label: "Selling as", value: seller.producerType ? t(`onboarding.options.producerTypes.${seller.producerType}`) : "" },
      { label: "Land", value: seller.farmSize ? t(`onboarding.options.farmSizes.${seller.farmSize}`) : "" },
    ]
    bio = seller.bio
  }

  const initials = title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("")
  const shown = chips.slice(0, 8)

  return (
    <div className="max-w-md rounded-[28px] bg-card p-5 text-foreground">
      <div className="flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-amama-subtle text-[16px] font-bold text-amama-deep">
          {initials || <Bar className="size-5 rounded-full" />}
        </span>
        <div className="min-w-0 flex-1">
          {title ? <p className="truncate text-[17px] font-semibold leading-tight">{title}</p> : <Bar className="h-3.5 w-36" />}
          {subtitle.some(Boolean) ? (
            <p className="mt-1 truncate text-[13px] text-muted-foreground">{subtitle.filter(Boolean).join(" · ")}</p>
          ) : (
            <Bar className="mt-2 h-2.5 w-24" />
          )}
        </div>
      </div>

      {bio ? <p className="mt-4 line-clamp-3 text-[13.5px] leading-relaxed text-foreground/80">{bio}</p> : null}

      <div className="mt-4 flex flex-wrap gap-1.5">
        {shown.length > 0
          ? shown.map((chip) => (
              <span key={chip} className="rounded-full bg-muted px-2.5 py-1 text-[12.5px] font-medium">
                {chip}
              </span>
            ))
          : [56, 72, 48].map((width) => <Bar key={width} className="h-6" style={{ width }} />)}
        {chips.length > shown.length ? (
          <span className="rounded-full px-1.5 py-1 text-[12.5px] font-medium text-muted-foreground">+{chips.length - shown.length}</span>
        ) : null}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
        {facts.map((fact) => (
          <div key={fact.label} className="min-w-0">
            <dt className="text-[12px] text-muted-foreground">{fact.label}</dt>
            <dd className="mt-0.5 truncate text-[13.5px] font-medium">{fact.value || <Bar className="mt-1.5 h-2.5 w-16" />}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function Bar({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <span aria-hidden className={cn("block rounded-full bg-muted", className)} style={style} />
}

export { OnboardingAside }
