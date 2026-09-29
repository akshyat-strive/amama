"use client"

import { cn } from "@/lib/utils"

/**
 * A wishlist filter as a switch rather than a labelled button: the heart is
 * the thumb, sliding across and filling in when the filter is on. The
 * heart says what it is, so there is no label beside it.
 */
function WishlistSwitch({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Show wishlist only"
      title={checked ? "Showing wishlist" : "Show wishlist only"}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative h-9 w-[60px] shrink-0 rounded-full border transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40",
        checked ? "border-rose-500/30 bg-rose-500/15" : "border-border bg-muted hover:bg-muted/70"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-1/2 left-[3px] grid size-7 -translate-y-1/2 place-items-center rounded-full bg-card shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none",
          checked ? "translate-x-6" : "translate-x-0"
        )}
      >
        <svg viewBox="0 0 24 24" className="size-4">
          <path
            d="M12 20.5s-7.5-4.6-9.2-9.3C1.6 7.8 3.9 4.5 7.3 4.5c2 0 3.5 1.1 4.7 2.8 1.2-1.7 2.7-2.8 4.7-2.8 3.4 0 5.7 3.3 4.5 6.7-1.7 4.7-9.2 9.3-9.2 9.3Z"
            strokeWidth={1.8}
            strokeLinejoin="round"
            className={cn(
              "transition-[fill,stroke] duration-300",
              checked ? "fill-rose-500 stroke-rose-500" : "fill-transparent stroke-foreground/55"
            )}
          />
        </svg>
      </span>
    </button>
  )
}

export { WishlistSwitch }
