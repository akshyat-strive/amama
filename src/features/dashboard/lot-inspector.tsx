"use client"

import * as React from "react"
import QRCode from "react-qr-code"
import { CheckIcon, ChevronDownIcon, CopyIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { DemoOrder, LotMeta, TraceEntry } from "@/features/dashboard/demo-data"

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(timer)
  }, [copied])

  return (
    <button
      type="button"
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      title={copied ? "Copied" : "Copy"}
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => setCopied(true))
      }}
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-amama-deep/40",
        copied ? "bg-amama-subtle text-amama-deep" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {copied ? <CheckIcon aria-hidden className="size-3.5" /> : <CopyIcon aria-hidden className="size-3.5" />}
    </button>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="truncate text-[13px] font-medium text-foreground">{value}</dd>
    </div>
  )
}

/**
 * Everything the QR on a carton opens, laid out to be inspected rather
 * than read: identifiers you can copy, the code itself, the lot's identity
 * as key/value pairs, and its journey folded behind a progress line.
 */
function LotInspector({ order, meta, trace }: { order: DemoOrder; meta: LotMeta; trace: TraceEntry[] }) {
  const [journeyOpen, setJourneyOpen] = React.useState(false)
  const done = trace.filter((step) => step.done).length
  const current = trace.find((step) => !step.done)

  return (
    <section className="flex flex-col overflow-hidden rounded-[20px] border border-border bg-background">
      <header className="flex items-center justify-between gap-2 px-5 pt-4 pb-3">
        <h2 className="text-[14px] font-semibold text-foreground">Lot inspector</h2>
        <span className="font-mono text-[11px] text-muted-foreground">{order.id}</span>
      </header>

      <div className="flex gap-4 border-t border-border px-5 py-4">
        <div className="shrink-0 rounded-xl border border-border bg-white p-2">
          <QRCode value={meta.lotId} size={88} level="M" fgColor="#111111" bgColor="#ffffff" aria-label={`QR code for ${meta.lotId}`} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
          <div>
            <p className="text-[11px] text-muted-foreground">Lot ID</p>
            <div className="flex items-center gap-1">
              <span className="min-w-0 truncate font-mono text-[12.5px] font-semibold text-foreground" title={meta.lotId}>
                {meta.lotId}
              </span>
              <CopyButton value={meta.lotId} label="lot ID" />
            </div>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Order</p>
            <div className="flex items-center gap-1">
              <span className="min-w-0 truncate font-mono text-[12px] text-foreground" title={order.id}>
                {order.id}
              </span>
              <CopyButton value={order.id} label="order ID" />
            </div>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border px-5 py-4">
        <Field label="Farmer" value={`${meta.farmer} · ${meta.farmerId}`} />
        <Field label="Harvested" value={meta.harvestedOn} />
        <Field label="Region" value={meta.region} />
        <Field label="Grade" value={meta.grade} />
        <Field label="Quantity" value={meta.quantity} />
        <Field label="Destination" value={meta.destination} />
      </dl>

      <div className="border-t border-border">
        <button
          type="button"
          aria-expanded={journeyOpen}
          onClick={() => setJourneyOpen(!journeyOpen)}
          className="flex w-full items-center gap-3 px-5 py-3 text-start transition-colors hover:bg-muted/60"
        >
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between text-[12px]">
              <span className="font-medium text-foreground">Journey</span>
              <span className="text-muted-foreground tabular-nums">
                {done}/{trace.length}
              </span>
            </span>
            <span className="mt-1.5 flex gap-[2px]" aria-hidden>
              {trace.map((step) => (
                <span key={step.stage} className={cn("h-1 flex-1 rounded-full", step.done ? "bg-amama-deep" : "bg-border")} />
              ))}
            </span>
            {current ? <span className="mt-1.5 block truncate text-[11.5px] text-muted-foreground">Next · {current.stage}</span> : null}
          </span>
          <ChevronDownIcon aria-hidden className={cn("size-4 shrink-0 text-muted-foreground transition-transform", journeyOpen && "rotate-180")} />
        </button>
        {journeyOpen ? (
          <ol className="px-5 pb-4">
            {trace.map((step, index) => (
              <li key={step.stage} className="relative flex gap-3 pb-3 last:pb-0">
                {index < trace.length - 1 ? (
                  <span aria-hidden className={cn("absolute start-[5px] top-3 bottom-0 w-px", step.done ? "bg-amama-deep/40" : "bg-border")} />
                ) : null}
                <span
                  aria-hidden
                  className={cn("relative mt-1 size-[11px] shrink-0 rounded-full border-2", step.done ? "border-amama-deep bg-amama-deep" : "border-border bg-card")}
                />
                <span className="min-w-0">
                  <span className={cn("block text-[12.5px] font-medium", step.done ? "text-foreground" : "text-muted-foreground")}>{step.stage}</span>
                  <span className="block text-[11.5px] leading-snug text-muted-foreground">{step.detail}</span>
                </span>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </section>
  )
}

export { CopyButton, LotInspector }
