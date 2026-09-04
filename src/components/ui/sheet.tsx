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

/** `side="start"` respects RTL — it slides from the left in LTR, the right in RTL. */
function SheetContent({
  className,
  children,
  side = "start",
  ...props
}: DialogPrimitive.Popup.Props & { side?: "start" | "end" }) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Popup
        data-slot="sheet-content"
        className={cn(
          "fixed inset-y-0 z-50 flex w-72 flex-col gap-4 bg-popover p-4 text-popover-foreground shadow-xl outline-none duration-200",
          side === "start"
            ? cn(
                "start-0 border-e border-border",
                "data-open:animate-in data-open:slide-in-from-left rtl:data-open:slide-in-from-right",
                "data-closed:animate-out data-closed:slide-out-to-left rtl:data-closed:slide-out-to-right"
              )
            : cn(
                "end-0 border-s border-border",
                "data-open:animate-in data-open:slide-in-from-right rtl:data-open:slide-in-from-left",
                "data-closed:animate-out data-closed:slide-out-to-right rtl:data-closed:slide-out-to-left"
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
