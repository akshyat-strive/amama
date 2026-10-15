"use client"

import * as React from "react"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { Rfq } from "@/features/marketplace/rfq-store"

const STATUS_LABEL: Record<Rfq["status"], string> = { open: "Open", closed: "Closed", cancelled: "Cancelled" }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })
}

/**
 * The requirement behind an RFQ as plain key/value rows — every spec field
 * the buyer filled in, plus where the RFQ stands and who it went to. Shared
 * by the buyer's and the seller's RFQ pages, where it is the right-hand
 * column on wide screens; on a phone it folds down to a one-line summary
 * so the quotes stay the first thing on screen.
 */
function RfqRequirement({ rfq, className }: { rfq: Rfq; className?: string }) {
  const [open, setOpen] = React.useState(false)
  const { spec } = rfq
  const quoted = new Set(rfq.quotes.filter((quote) => quote.status !== "withdrawn").map((quote) => quote.sellerId)).size

  const rows: Array<{ label: string; value: string | null }> = [
    { label: "Status", value: STATUS_LABEL[rfq.status] },
    { label: "Created", value: formatDate(rfq.createdAt) },
    { label: "Sent to", value: `${rfq.sellers.length} ${rfq.sellers.length === 1 ? "seller" : "sellers"}` },
    { label: "Quoted", value: `${quoted} of ${rfq.sellers.length}` },
    { label: "Quantity", value: spec.quantityMt ? `${spec.quantityMt} MT` : null },
    { label: "Variety", value: spec.variety },
    { label: "Grade", value: spec.grade },
    { label: "Packaging", value: spec.packaging },
    { label: "Container", value: spec.containerType },
    { label: "Destination", value: spec.destinationPort },
    { label: "Incoterm", value: spec.incoterm },
    {
      label: "Shipping window",
      value: spec.shippingWindowFrom || spec.shippingWindowTo ? `${spec.shippingWindowFrom ?? "…"} → ${spec.shippingWindowTo ?? "…"}` : null,
    },
    { label: "Payment ask", value: spec.paymentTermPreference },
    { label: "Monthly volume", value: spec.monthlyVolumeMt ? `${spec.monthlyVolumeMt} MT` : null },
  ]
  const summary = [spec.quantityMt ? `${spec.quantityMt} MT` : null, spec.destinationPort, spec.incoterm].filter(Boolean).join(" · ")

  return (
    <section aria-label="Requirement" className={cn("rounded-[20px] bg-card p-1.5", className)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 rounded-2xl px-2.5 py-2 text-start lg:pointer-events-none"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-foreground">Requirement</span>
          {summary ? <span className="mt-0.5 block truncate text-[12px] text-muted-foreground lg:hidden">{summary}</span> : null}
        </span>
        <ChevronDownIcon aria-hidden className={cn("size-4 shrink-0 text-muted-foreground transition-transform lg:hidden", open && "rotate-180")} />
      </button>
      <div className={cn("px-2.5 pb-1.5", open ? "block" : "hidden", "lg:block")}>
        <dl className="divide-inset text-[13px]">
          {rows
            .filter((row): row is { label: string; value: string } => Boolean(row.value))
            .map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-4 py-2">
                <dt className="shrink-0 text-muted-foreground">{row.label}</dt>
                <dd className="min-w-0 text-end font-medium text-foreground">{row.value}</dd>
              </div>
            ))}
        </dl>
        {spec.notes ? (
          <div className="border-t border-border pt-2.5 pb-1 text-[13px]">
            <p className="text-muted-foreground">Notes</p>
            <p className="mt-1 leading-relaxed text-foreground/85">{spec.notes}</p>
          </div>
        ) : null}
      </div>
    </section>
  )
}

export { RfqRequirement }
