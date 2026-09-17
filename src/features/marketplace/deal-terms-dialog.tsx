"use client"

import * as React from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

export type DealTerms = {
  pricePerTonneUsd: number
  quantityMt: number
  incoterm: string | null
  deliveryWindow: string | null
  note: string | null
}

/** The shipping terms a grower or importer actually argues about. Kept to
 *  the six that cover essentially all agri trade rather than the full
 *  Incoterms list, so the picker stays scannable. */
const INCOTERMS = ["EXW", "FOB", "CFR", "CIF", "DAP", "DDP"]

/**
 * One form for both halves of a negotiation: making the first offer and
 * answering one with a different number are the same act from the user's
 * point of view, so they get the same surface rather than two that drift
 * apart. The caller supplies the copy and what to do with the result.
 *
 * Price and quantity are the only required fields — the rest are the
 * details a deal usually also turns on, offered but never blocking, so a
 * quick counter stays quick.
 */
function DealTermsDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  initial,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  submitLabel: string
  initial: Partial<DealTerms>
  onSubmit: (terms: DealTerms) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* Mounted only while open, so every open starts from the terms
            currently on the table — a fresh mount reads them through
            `useState` initializers instead of an effect racing to reset
            whatever was half-typed and abandoned last time. */}
        {open ? (
          <TermsFields
            initial={initial}
            submitLabel={submitLabel}
            onSubmit={(terms) => {
              onSubmit(terms)
              onOpenChange(false)
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function TermsFields({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial: Partial<DealTerms>
  submitLabel: string
  onSubmit: (terms: DealTerms) => void
}) {
  const [price, setPrice] = React.useState(() =>
    initial.pricePerTonneUsd ? String(initial.pricePerTonneUsd) : ""
  )
  const [quantity, setQuantity] = React.useState(() =>
    initial.quantityMt ? String(initial.quantityMt) : ""
  )
  // `null`, not `undefined` — Base UI decides controlled-vs-uncontrolled on
  // the first render, and `undefined` there means "uncontrolled forever".
  const [incoterm, setIncoterm] = React.useState<string | null>(initial.incoterm ?? null)
  const [deliveryWindow, setDeliveryWindow] = React.useState(initial.deliveryWindow ?? "")
  const [note, setNote] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  const submit = () => {
    const priceNum = Number(price)
    const quantityNum = Number(quantity)
    if (!(priceNum > 0) || !(quantityNum > 0)) {
      setError("Enter a price and quantity above zero.")
      return
    }
    onSubmit({
      pricePerTonneUsd: priceNum,
      quantityMt: quantityNum,
      incoterm: incoterm ?? null,
      deliveryWindow: deliveryWindow.trim() || null,
      note: note.trim() || null,
    })
  }

  const total = Number(price) * Number(quantity)

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
            Price (USD / tonne)
            <Input type="number" min={1} value={price} onChange={(event) => setPrice(event.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
            Quantity (MT)
            <Input type="number" min={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          </label>
        </div>

        {/* The number both sides are really deciding on, worked out for
            them — the per-tonne price alone hides the size of the
            commitment. */}
        {total > 0 ? (
          <div className="flex items-baseline justify-between rounded-2xl bg-amama-subtle px-4 py-3">
            <span className="text-[12px] font-medium text-muted-foreground">Total contract value</span>
            <span className="text-[18px] font-bold text-amama-deep">
              {new Intl.NumberFormat("en", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 0,
              }).format(total)}
            </span>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
            Incoterm
            <Select value={incoterm} onValueChange={(value) => setIncoterm(value ?? null)}>
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                {INCOTERMS.map((term) => (
                  <SelectItem key={term} value={term}>
                    {term}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
            Delivery window
            <Input
              placeholder="e.g. March 2026"
              value={deliveryWindow}
              onChange={(event) => setDeliveryWindow(event.target.value)}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
          Add a note
          <Textarea
            rows={2}
            placeholder="Anything the other side should know about these terms…"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>

        {error ? <p className="text-[13px] font-medium text-destructive">{error}</p> : null}
      </div>

      <DialogFooter>
        <Button onClick={submit}>{submitLabel}</Button>
      </DialogFooter>
    </>
  )
}

export { DealTermsDialog }
