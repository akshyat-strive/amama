"use client"

import * as React from "react"
import { Building2Icon, InfoIcon, ShipIcon, WarehouseIcon, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { INCOTERM_NAMES, INCOTERM_OBLIGATIONS, INCOTERM_ORDER, INCOTERM_SEA_ONLY, type IncotermCode } from "@/features/marketplace/incoterms"

/**
 * The one Incoterm picker every deal/RFQ/term-sheet form in the app uses
 * — a closed list of the eleven real 2020 codes, never a free-text field
 * ("CIF " and "cif" and "C.I.F." are three different strings a moment
 * later, and none of them are a real Incoterm), each row showing the
 * full name so a reader who doesn't have all eleven memorized still
 * knows what they're picking.
 */
function IncotermSelect({
  value,
  onValueChange,
  size,
  className,
}: {
  value: string | null
  onValueChange: (value: string | null) => void
  size?: "sm" | "default"
  className?: string
}) {
  return (
    <Select value={value} onValueChange={(next) => onValueChange((next as string | null) ?? null)}>
      <SelectTrigger size={size} className={cn("w-full", className)}>
        <SelectValue placeholder="Select an Incoterm" />
      </SelectTrigger>
      <SelectContent>
        {INCOTERM_ORDER.map((code) => (
          <SelectItem key={code} value={code}>
            {code} — {INCOTERM_NAMES[code]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** An icon-only info button, meant to sit right beside an Incoterm select
 *  or label anywhere one appears — opens the same responsibility table
 *  regardless of which code (if any) is currently chosen, since the
 *  point is comparing all eleven, not just explaining one. */
function IncotermInfoButton({ className }: { className?: string }) {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="What does each Incoterm cover?"
        title="What does each Incoterm cover?"
        className={cn(
          "inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground",
          className
        )}
      >
        <InfoIcon className="size-4" />
      </button>
      <IncotermInfoDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

/** The eleven-column responsibility chart — origin (seller's own
 *  premises) on the left through to the buyer's named destination on the
 *  right, same order as the picker, with each row one obligation or cost
 *  line. A reference for who-pays-what on a quote, not a substitute for
 *  the actual ICC rule text on a signed contract. */
function IncotermInfoDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] w-full max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Incoterms® 2020 — who&apos;s responsible for what</DialogTitle>
          <DialogDescription>
            Seller&apos;s premises on the left, the buyer&apos;s named destination on the right — each column is
            one Incoterm, each row one obligation or cost. A quick reference, not a substitute for the ICC
            rule text on the actual contract.
          </DialogDescription>
        </DialogHeader>

        <IncotermJourneyStrip />

        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[720px] border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="sticky start-0 z-10 bg-muted px-3 py-2 text-start font-semibold text-foreground">
                  Obligation / charge
                </th>
                {INCOTERM_ORDER.map((code) => (
                  <th key={code} className="px-2.5 py-2 text-center font-semibold text-foreground">
                    <div className="tabular-nums">{code}</div>
                    {INCOTERM_SEA_ONLY.has(code) ? (
                      <div className="mt-0.5 text-[10px] font-normal text-muted-foreground">Sea only</div>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {INCOTERM_OBLIGATIONS.map((row, index) => (
                <tr key={row.label} className={cn(index % 2 === 1 && "bg-muted/40")}>
                  <td className="sticky start-0 z-10 bg-inherit px-3 py-2 font-medium text-foreground">
                    {row.label}
                  </td>
                  {INCOTERM_ORDER.map((code) => (
                    <td key={code} className="px-2.5 py-2 text-center">
                      <ResponsibilityBadge value={row.responsibility[code]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[12px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <ResponsibilityBadge value="seller" /> Seller
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ResponsibilityBadge value="buyer" /> Buyer
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ResponsibilityBadge value="varies" /> Depends on the named place
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const JOURNEY_NODES: { icon: LucideIcon; label: string; sublabel: string }[] = [
  { icon: WarehouseIcon, label: "Seller", sublabel: "Origin / factory" },
  { icon: ShipIcon, label: "Freight", sublabel: "Carriage & insurance" },
  { icon: Building2Icon, label: "Buyer", sublabel: "Named destination" },
]

/** The three parties a reader actually needs oriented before the detailed
 *  matrix means anything — same big-circle-plus-connecting-line language
 *  as the shipment tracker's own stage stepper, so "who's on the hook
 *  between here and there" reads the same way everywhere in the app. */
function IncotermJourneyStrip() {
  return (
    <div className="flex items-start rounded-2xl bg-muted p-4">
      {JOURNEY_NODES.map((node, index) => {
        const Icon = node.icon
        return (
          <React.Fragment key={node.label}>
            <div className="flex shrink-0 flex-col items-center gap-1.5 text-center">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-foreground text-background">
                <Icon className="size-5" />
              </span>
              <span className="text-[11px] font-semibold text-foreground">{node.label}</span>
              <span className="max-w-[92px] text-[10px] leading-tight text-muted-foreground">{node.sublabel}</span>
            </div>
            {index < JOURNEY_NODES.length - 1 ? (
              <span aria-hidden className="mx-2 mt-[22px] h-[3px] flex-1 rounded-full bg-border" />
            ) : null}
          </React.Fragment>
        )
      })}
    </div>
  )
}

function ResponsibilityBadge({ value }: { value: "seller" | "buyer" | "varies" }) {
  return (
    <span
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-full text-[11px] font-bold",
        value === "seller"
          ? "bg-amama-subtle text-amama-deep"
          : value === "buyer"
            ? "bg-muted text-foreground"
            : "bg-status-warning/10 text-status-warning"
      )}
    >
      {value === "seller" ? "S" : value === "buyer" ? "B" : "?"}
    </span>
  )
}

export type { IncotermCode }
export { IncotermSelect, IncotermInfoButton, IncotermInfoDialog }
