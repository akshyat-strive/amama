"use client"

import Link from "next/link"
import { ArrowUpRightIcon, type LucideIcon } from "lucide-react"

import { CropImage } from "@/features/marketplace/crop-image"

/**
 * One tile in the catalog drill-down (category → product → variant): the
 * photo carries the price as an overlay chip, the name and a one-line
 * subtitle sit under it, and the whole tile lifts slightly on hover.
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
      className="group block rounded-[22px] border border-border bg-card p-1.5 transition-[transform,box-shadow,border-color] duration-200 outline-none hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-[0_14px_30px_-16px_rgba(0,0,0,0.3)] focus-visible:ring-2 focus-visible:ring-amama-deep/40"
    >
      <div className="relative aspect-4/3 w-full overflow-hidden rounded-[16px] bg-amama-subtle">
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
          <span className="absolute bottom-2 left-2 rounded-full bg-card/92 px-2.5 py-1 text-[11.5px] font-semibold text-foreground shadow-sm backdrop-blur tabular-nums">
            {meta}
          </span>
        ) : null}
      </div>
      <div className="flex items-start justify-between gap-2 px-1.5 pt-2.5 pb-1.5">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-foreground sm:text-[15px]">{title}</p>
          {subtitle ? <p className="truncate text-[12px] text-muted-foreground">{subtitle}</p> : null}
        </div>
        <ArrowUpRightIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
    </Link>
  )
}

export { CatalogTile }
