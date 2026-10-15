"use client"

import * as React from "react"
import { SlidersHorizontalIcon, XIcon } from "lucide-react"

import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet"

type Control = {
  /** The heading above this control in the sheet. */
  label: string
  /** The control itself. `inSheet` is true in the phone sheet, where it
   *  should fill the width. */
  render: (inSheet: boolean) => React.ReactNode
}

/**
 * Header toggles that don't fit a phone. On wide screens the controls sit
 * inline, as they always did; on a phone they collapse behind one filter
 * button that opens a bottom sheet — so the header stays one clean row.
 * `active` puts a dot on the button when something isn't at its default.
 */
function ControlsSheet({ title = "Filters", active = false, controls }: { title?: string; active?: boolean; controls: Control[] }) {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <div className="hidden items-center gap-2 sm:flex">
        {controls.map((control) => (
          <React.Fragment key={control.label}>{control.render(false)}</React.Fragment>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={title}
        className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-card text-foreground transition-colors hover:bg-muted sm:hidden"
      >
        <SlidersHorizontalIcon aria-hidden className="size-[18px]" />
        {active ? <span aria-hidden className="absolute end-2 top-2 size-2 rounded-full bg-amama-deep ring-2 ring-card" /> : null}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="responsive" className="overflow-y-auto sm:max-w-sm">
          <div className="flex flex-col gap-6 pb-2">
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-semibold tracking-[-0.02em]">{title}</h2>
              <SheetClose aria-label={`Close ${title.toLowerCase()}`} className="grid size-9 place-items-center rounded-full bg-card text-foreground/75 transition-colors hover:bg-muted">
                <XIcon aria-hidden className="size-4" />
              </SheetClose>
            </div>
            {controls.map((control) => (
              <div key={control.label} className="flex flex-col gap-2">
                <p className="text-[13px] font-medium text-muted-foreground">{control.label}</p>
                {control.render(true)}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

/** Stretches a ButtonGroup across the sheet. */
const SHEET_GROUP = "flex w-full [&>button]:h-11 [&>button]:flex-1 [&>button]:justify-center"

export { ControlsSheet, SHEET_GROUP }
