"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatRupees, inrToUsd } from "@/features/marketplace/currency"
import { IncotermInfoButton, IncotermSelect } from "@/features/marketplace/incoterm-picker"
import { submitQuote, type Rfq } from "@/features/marketplace/rfq-store"

/**
 * A seller's answer to an RFQ — the same price/quantity/terms shape a deal
 * proposal uses, plus the two fields that make this a real quotation rather
 * than a chat reply: a validity date and their own payment-term ask.
 */
function RfqQuoteDialog({
  open,
  onOpenChange,
  rfq,
  sellerId,
  sellerName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  rfq: Rfq
  sellerId: string
  sellerName: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quote &ldquo;{rfq.title}&rdquo;</DialogTitle>
          <DialogDescription>
            {rfq.buyerName} will see this alongside any other sellers&apos; quotes — put your best terms
            forward.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <QuoteFields
            onSubmit={(terms) => {
              submitQuote(rfq.id, { sellerId, sellerName, ...terms })
              onOpenChange(false)
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function QuoteFields({
  onSubmit,
}: {
  onSubmit: (terms: {
    pricePerTonneUsd: number
    quantityMt: number
    incoterm: string | null
    deliveryWindow: string | null
    paymentTerm: string | null
    validUntil: string | null
    note: string | null
  }) => void
}) {
  const [price, setPrice] = React.useState("")
  const [quantity, setQuantity] = React.useState("")
  const [incoterm, setIncoterm] = React.useState<string | null>(null)
  const [deliveryWindow, setDeliveryWindow] = React.useState("")
  const [paymentTerm, setPaymentTerm] = React.useState("")
  const [validUntil, setValidUntil] = React.useState("")
  const [note, setNote] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  const total = Number(price) * Number(quantity)

  const submit = () => {
    const priceNum = Number(price)
    const quantityNum = Number(quantity)
    if (!(priceNum > 0) || !(quantityNum > 0)) {
      setError("Enter a price and quantity above zero.")
      return
    }
    onSubmit({
      pricePerTonneUsd: Math.round(inrToUsd(priceNum)),
      quantityMt: quantityNum,
      incoterm,
      deliveryWindow: deliveryWindow.trim() || null,
      paymentTerm: paymentTerm.trim() || null,
      validUntil: validUntil || null,
      note: note.trim() || null,
    })
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
            Price (₹ / tonne)
            <Input type="number" min={1} value={price} onChange={(event) => setPrice(event.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
            Quantity (MT)
            <Input type="number" min={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          </label>
        </div>

        {total > 0 ? (
          <div className="flex items-baseline justify-between rounded-2xl bg-amama-subtle px-4 py-3">
            <span className="text-[12px] font-medium text-muted-foreground">Total quote value</span>
            <span className="text-[18px] font-bold text-amama-deep">{formatRupees(total)}</span>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
            <span className="flex items-center gap-1.5">
              Incoterm
              <IncotermInfoButton />
            </span>
            <IncotermSelect value={incoterm} onValueChange={setIncoterm} />
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

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
            Payment terms
            <Input
              placeholder="e.g. 30% T/T advance, 70% on B/L"
              value={paymentTerm}
              onChange={(event) => setPaymentTerm(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
            Quote valid until
            <Input type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} />
          </label>
        </div>

        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
          Add a note
          <Textarea
            rows={2}
            placeholder="Anything the buyer should know about this quote…"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>

        {error ? <p className="text-[13px] font-medium text-destructive">{error}</p> : null}
      </div>

      <DialogFooter>
        <Button onClick={submit}>Send quote</Button>
      </DialogFooter>
    </>
  )
}

export { RfqQuoteDialog }
