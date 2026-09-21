"use client"

import Link from "next/link"
import Image from "next/image"
import type { LucideIcon } from "lucide-react"

import { cropImageUrl } from "@/features/onboarding/steps"

/**
 * One tile in the catalog drill-down (category → product → variant) —
 * deliberately the same bento shape `ListingCard` already uses at the
 * marketplace's leaf (seller list), so the whole browse path from top to
 * bottom reads as one consistent grid, not three different card styles
 * stitched together. A category tile has no real photo of its own (it's a
 * grouping, not a product), so it renders its `icon` instead; product and
 * variant tiles pass a `photo` — a real listing's photo standing in for
 * the group, since there's no separate "category art" to draw on.
 */
function CatalogTile({
  href,
  icon: Icon,
  photo,
  title,
  subtitle,
  meta,
}: {
  href: string
  icon?: LucideIcon
  photo?: string | null
  title: string
  subtitle?: string | null
  meta?: string | null
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-2 transition-colors hover:border-amama-deep/40 sm:rounded-[28px] sm:p-3"
    >
      <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl bg-amama-subtle sm:rounded-2xl">
        {photo ? (
          <Image
            src={cropImageUrl(photo, 480)}
            alt={title}
            fill
            sizes="(min-width: 1280px) 380px, (min-width: 640px) 45vw, 45vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : Icon ? (
          <div className="grid h-full place-items-center">
            <Icon className="size-10 text-amama-deep/70 sm:size-12" strokeWidth={1.75} />
          </div>
        ) : null}
      </div>

      <div className="flex flex-col pt-2 sm:pt-3">
        <p className="truncate text-[13px] font-bold text-foreground sm:text-[16px]">{title}</p>
        {subtitle ? (
          <p className="mt-0.5 truncate text-[12px] text-muted-foreground sm:text-[13px]">{subtitle}</p>
        ) : null}
        {meta ? (
          <p className="mt-1.5 truncate text-[12px] font-semibold text-amama-deep sm:text-[13px]">{meta}</p>
        ) : null}
      </div>
    </Link>
  )
}

export { CatalogTile }
