"use client"

import * as React from "react"
import Image from "next/image"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type SelectableTileProps = {
  selected: boolean
  label: string
  onToggle: () => void
  /** A full-bleed photo background (crops) — mutually exclusive with `icon`. */
  photo?: { src: string; alt: string }
  /** A badge (e.g. a certification mark) shown above the label instead of a photo. */
  icon?: React.ReactNode
  /** Second line under the label — switches the tile to a fixed-height card
   *  layout instead of a square, since certification names vary a lot in length. */
  hint?: string
  className?: string
}

/**
 * Pinterest's interest picker in miniature: a big, tappable tile that states
 * its selection with a filled brand check rather than colour alone, so the
 * state survives greyscale and colour-blind vision.
 *
 * `photo` tiles are a small product card: a fixed-ratio photo on top with
 * its own rounded corners (from the outer `overflow-hidden`, not a separate
 * radius), and the label lives underneath in its own strip — never over the
 * image, where it would fight the photo for contrast and crop unpredictably
 * depending on what's in the shot. `icon`/`hint` tiles (certifications) stay
 * a flat card with a fixed height instead, since their names vary a lot in
 * length and there's no photo to anchor a split layout to.
 */
function SelectableTile({
  selected,
  label,
  photo,
  icon,
  hint,
  onToggle,
  className,
}: SelectableTileProps) {
  if (photo) {
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={selected}
        onClick={onToggle}
        className={cn(
          "group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-150 ease-out",
          "outline-none focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-offset-2",
          "focus-visible:ring-offset-background active:scale-[0.97] motion-reduce:active:scale-100",
          // One background for the whole card — the padding around the photo
          // and the label strip below both show this same colour, instead of
          // each deciding its own and drifting out of sync on selection.
          selected
            ? "border-amama-deep bg-amama-subtle"
            : "border-border bg-card hover:border-muted-foreground/40 hover:bg-muted/60",
          className
        )}
      >
        <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-xl p-1">
          <div className="relative h-full w-full overflow-hidden rounded-xl">
            <Image
              src={photo.src}
              alt=""
              fill
              sizes="(min-width: 640px) 220px, 45vw"
              className="object-cover"
            />
          </div>
          <span
            aria-hidden
            className={cn(
              "absolute end-3 top-3 grid size-5 shrink-0 place-items-center rounded-full transition-all duration-150",
              selected
                ? "scale-100 bg-amama-deep text-white opacity-100"
                : "scale-75 bg-white/80 opacity-0 group-hover:opacity-100"
            )}
          >
            <CheckIcon className="size-3.5" strokeWidth={3} />
          </span>
        </div>
        {/* The extended footer strip — transparent, so it always matches
            whatever background the card itself just decided above. */}
        <span className="flex h-8 items-center justify-center px-2 text-center">
          <span
            className={cn(
              "line-clamp-2 text-[13px] font-semibold leading-snug text-balance",
              selected ? "text-amama-deep" : "text-foreground"
            )}
          >
            {label}
          </span>
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onToggle}
      className={cn(
        "group relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 p-3 text-center transition-all duration-150 ease-out",
        "outline-none focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-offset-2",
        "focus-visible:ring-offset-background active:scale-[0.97] motion-reduce:active:scale-100",
        hint ? "h-[132px]" : "aspect-[4/3]",
        selected
          ? "border-amama-deep bg-amama-subtle"
          : "border-border bg-card hover:border-muted-foreground/40 hover:bg-muted/60",
        className
      )}
    >
      {icon ? (
        <span
          aria-hidden
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-full",
            selected ? "bg-amama-deep text-white" : "bg-muted text-foreground/70"
          )}
        >
          {icon}
        </span>
      ) : null}
      <span
        className={cn(
          "line-clamp-2 text-[13px] font-semibold leading-snug text-balance",
          selected ? "text-amama-deep" : "text-foreground"
        )}
      >
        {label}
      </span>
      {hint ? (
        <span className="line-clamp-1 text-[11px] leading-snug text-muted-foreground">
          {hint}
        </span>
      ) : null}
      <span
        aria-hidden
        className={cn(
          "absolute end-2 top-2 grid size-5 shrink-0 place-items-center rounded-full transition-all duration-150",
          selected
            ? "scale-100 bg-amama-deep text-white opacity-100"
            : "scale-75 opacity-0"
        )}
      >
        <CheckIcon className="size-3.5" strokeWidth={3} />
      </span>
    </button>
  )
}

/**
 * Wraps a grid of `SelectableTile` checkboxes with the group semantics a
 * plain `<div>` doesn't give them for free. Each tile already exposes its
 * own name and checked state, but without this a screen reader landing in
 * the grid announces a bare run of checkboxes with no sense of what they're
 * a checklist *of* — this is what `aria-label` (usually the step's own
 * heading) supplies. Always required, not optional, for exactly that
 * reason — there's no such thing as a tile grid that doesn't need one.
 */
function SelectableTileGroup({
  ...props
}: React.ComponentProps<"div"> & { "aria-label": string }) {
  return <div role="group" {...props} />
}

/**
 * The same hairline-bordered, divided-list container as `FieldGroup` — wraps
 * a set of `SelectableRow`s so the group gets one outline instead of every
 * option carrying its own heavy border.
 */
function SelectableGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      role="radiogroup"
      className={cn(
        "divide-y divide-border overflow-hidden rounded-2xl border border-border",
        className
      )}
      {...props}
    />
  )
}

/** A single-choice row — used for business type, volume, farm size and the
 *  like. Always rendered inside a `SelectableGroup`, never on its own. */
function SelectableRow({
  selected,
  label,
  hint,
  onSelect,
  name,
}: {
  selected: boolean
  label: string
  hint?: string
  onSelect: () => void
  name: string
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 px-4 py-3.5 transition-colors",
        "active:scale-[0.99] motion-reduce:active:scale-100",
        "has-focus-visible:bg-muted/50",
        selected ? "bg-amama-subtle" : "bg-card hover:bg-muted/60"
      )}
    >
      <input
        type="radio"
        name={name}
        checked={selected}
        onChange={onSelect}
        className="sr-only"
      />
      <span className="flex-1">
        <span
          className={cn(
            "block text-[15px] font-semibold",
            selected ? "text-amama-deep" : "text-foreground"
          )}
        >
          {label}
        </span>
        {hint ? (
          <span className="mt-0.5 block text-[13px] text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </span>
      <span
        aria-hidden
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded-full border-2 transition-all duration-150",
          selected
            ? "border-amama-deep bg-amama-deep text-white"
            : "border-border bg-transparent"
        )}
      >
        <CheckIcon
          className={cn(
            "size-3.5 transition-opacity",
            selected ? "opacity-100" : "opacity-0"
          )}
          strokeWidth={3}
        />
      </span>
    </label>
  )
}

export { SelectableTile, SelectableTileGroup, SelectableRow, SelectableGroup }