"use client"

import Link from "next/link"
import { ArrowUpRightIcon, type LucideIcon } from "lucide-react"

import { CropImage } from "@/features/marketplace/crop-image"

/**
 * A product in the marketplace: the photo carries the starting price as a
 * chip, the name and a one-line subtitle sit under it. Products are the
 * one level shown as pictures — grades are specs and sellers are people
 * (see `marketplace-ui.tsx`).
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
      className="group block rounded-[28px] bg-card p-2 transition-colors duration-200 outline-none hover:bg-[#ededf1] focus-visible:ring-2 focus-visible:ring-amama-deep/40 dark:hover:bg-muted"
    >
      <div className="relative aspect-4/3 w-full overflow-hidden rounded-[22px] bg-amama-subtle">
        {photo ? (
          <CropImage
            photo={photo}
            alt={title}
            sizes="(min-width: 1280px) 300px, (min-width: 640px) 30vw, 50vw"
            className="transition-[opacity,transform] duration-500 group-hover:scale-[1.05]"
          />
        ) : Icon ? (
          <div className="grid h-full place-items-center">
            <Icon className="size-10 text-amama-deep/70" strokeWidth={1.75} />
          </div>
        ) : null}
        {meta ? (
          <span className="absolute bottom-2.5 left-2.5 rounded-full bg-background/92 px-2.5 py-1 text-[12px] font-semibold text-foreground backdrop-blur tabular-nums">
            {meta}
          </span>
        ) : null}
      </div>
      <div className="flex items-start justify-between gap-2 px-2 pt-3 pb-2">
        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold tracking-[-0.016em] text-foreground">{title}</p>
          {subtitle ? <p className="truncate text-[13px] text-muted-foreground">{subtitle}</p> : null}
        </div>
        <ArrowUpRightIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
    </Link>
  )
}

export { CatalogTile }
