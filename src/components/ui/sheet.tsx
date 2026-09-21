"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * A slide-in panel — same `@base-ui/react/dialog` primitive as `dialog.tsx`
 * (Base UI has no separate sheet/drawer primitive; a sheet just repositions
 * and re-animates the dialog popup), used here for the mobile nav drawer.
 */
function Sheet({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="sheet" {...props} />
}

function SheetPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/40 duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

/** `side="start"` respects RTL — it slides from the left in LTR, the right
 *  in RTL. `side="responsive"` is the detail-drawer shape used outside the
 *  nav (an RFQ, an order, anything a list row opens into): a bottom sheet
 *  on a narrow screen, capped short of the viewport with rounded top
 *  corners, and a right-hand side sheet from `sm` up — one component
 *  covering both rather than a JS viewport check picking between two. */
function SheetContent({
  className,
  children,
  side = "start",
  ...props
}: DialogPrimitive.Popup.Props & { side?: "start" | "end" | "responsive" }) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Popup
        data-slot="sheet-content"
        className={cn(
          "fixed z-50 flex flex-col gap-4 bg-popover p-4 text-popover-foreground shadow-xl outline-none duration-200",
          side === "start" &&
            cn(
              "inset-y-0 start-0 w-72 border-e border-border",
              "data-open:animate-in data-open:slide-in-from-left rtl:data-open:slide-in-from-right",
              "data-closed:animate-out data-closed:slide-out-to-left rtl:data-closed:slide-out-to-right"
            ),
          side === "end" &&
            cn(
              "inset-y-0 end-0 w-72 border-s border-border",
              "data-open:animate-in data-open:slide-in-from-right rtl:data-open:slide-in-from-left",
              "data-closed:animate-out data-closed:slide-out-to-right rtl:data-closed:slide-out-to-left"
            ),
          side === "responsive" &&
            cn(
              "inset-x-0 bottom-0 max-h-[85dvh] w-full rounded-t-2xl border-t border-border",
              "data-open:animate-in data-open:slide-in-from-bottom",
              "data-closed:animate-out data-closed:slide-out-to-bottom",
              "sm:inset-y-0 sm:end-0 sm:start-auto sm:bottom-auto sm:h-full sm:max-h-none sm:w-[440px] sm:rounded-none sm:rounded-s-2xl sm:border-t-0 sm:border-s",
              // `slide-in-from-bottom`/`slide-out-to-bottom` above set the Y
              // translate custom property; at `sm` and up we're sliding from
              // the side instead, but that custom property doesn't reset on
              // its own just because a differently-named utility now sets
              // the X one — without explicitly zeroing Y here too, the
              // panel animates in from the bottom-*right* corner (both
              // translates active at once) instead of cleanly from the side.
              "sm:data-open:slide-in-from-bottom-0 sm:data-open:slide-in-from-right rtl:sm:data-open:slide-in-from-left",
              "sm:data-closed:slide-out-to-bottom-0 sm:data-closed:slide-out-to-right rtl:sm:data-closed:slide-out-to-left"
            ),
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Popup>
    </SheetPortal>
  )
}

function SheetClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="sheet-close" {...props} />
}

/** Small icon-only close button, positioned top-end of the panel. */
function SheetCloseButton() {
  return (
    <SheetClose
      render={<Button variant="ghost" size="icon-sm" className="self-end" />}
    >
      <XIcon />
      <span className="sr-only">Close menu</span>
    </SheetClose>
  )
}

export { Sheet, SheetPortal, SheetOverlay, SheetContent, SheetClose, SheetCloseButton }
