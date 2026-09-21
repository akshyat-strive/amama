"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createRfq, type RfqSpec } from "@/features/marketplace/rfq-store"

const INCOTERMS = ["EXW", "FOB", "CFR", "CIF", "DAP", "DDP"]

export type RfqCandidateSeller = {
  sellerId: string
  sellerName: string
  listingId: string
  listingTitle: string
}

/**
 * The buyer's "formalize this demand" moment — the structured brief from
 * the standard agro-export RFQ checklist (product, packaging, logistics,
 * timing, quantity, payment), sent to as many of the matched sellers as
 * the buyer picks at once, so the quotes that come back are actually
 * comparable.
 */
function RfqDialog({
  open,
  onOpenChange,
  buyerId,
  buyerName,
  productCategory,
  productLabel,
  candidateSellers,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  buyerId: string
  buyerName: string
  productCategory: string
  productLabel: string
  candidateSellers: RfqCandidateSeller[]
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request quotes (RFQ)</DialogTitle>
          <DialogDescription>
            Publish one requirement to several sellers at once and compare what comes back — this doesn&apos;t
            commit you to anything until you accept a quote.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <RfqFields
            buyerId={buyerId}
            buyerName={buyerName}
            productCategory={productCategory}
            productLabel={productLabel}
            candidateSellers={candidateSellers}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function RfqFields({
  buyerId,
  buyerName,
  productCategory,
  productLabel,
  candidateSellers,
  onDone,
}: {
  buyerId: string
  buyerName: string
  productCategory: string
  productLabel: string
  candidateSellers: RfqCandidateSeller[]
  onDone: () => void
}) {
  const [title, setTitle] = React.useState(`${productLabel} — sourcing requirement`)
  const [selectedSellerIds, setSelectedSellerIds] = React.useState<string[]>(
    () => candidateSellers.map((seller) => seller.sellerId)
  )

  const [variety, setVariety] = React.useState("")
  const [grade, setGrade] = React.useState("")
  const [quantityMt, setQuantityMt] = React.useState("")
  const [monthlyVolumeMt, setMonthlyVolumeMt] = React.useState("")
  const [packaging, setPackaging] = React.useState("")
  const [unitsPerCarton, setUnitsPerCarton] = React.useState("")
  const [containerType, setContainerType] = React.useState("")
  const [destinationPort, setDestinationPort] = React.useState("")
  const [incoterm, setIncoterm] = React.useState<string | null>(null)
  const [shippingWindowFrom, setShippingWindowFrom] = React.useState("")
  const [shippingWindowTo, setShippingWindowTo] = React.useState("")
  const [splitShipment, setSplitShipment] = React.useState(false)
  const [paymentTermPreference, setPaymentTermPreference] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  const toggleSeller = (sellerId: string) => {
    setSelectedSellerIds((current) =>
      current.includes(sellerId) ? current.filter((id) => id !== sellerId) : [...current, sellerId]
    )
  }

  const submit = () => {
    if (!title.trim()) {
      setError("Give this RFQ a title.")
      return
    }
    if (selectedSellerIds.length === 0) {
      setError("Pick at least one seller to send this to.")
      return
    }
    const spec: RfqSpec = {
      variety: variety.trim() || null,
      grade: grade.trim() || null,
      packaging: packaging.trim() || null,
      unitsPerCarton: unitsPerCarton ? Number(unitsPerCarton) : null,
      containerType: containerType.trim() || null,
      destinationPort: destinationPort.trim() || null,
      incoterm,
      shippingWindowFrom: shippingWindowFrom || null,
      shippingWindowTo: shippingWindowTo || null,
      splitShipment,
      quantityMt: quantityMt ? Number(quantityMt) : null,
      monthlyVolumeMt: monthlyVolumeMt ? Number(monthlyVolumeMt) : null,
      paymentTermPreference: paymentTermPreference.trim() || null,
      notes: notes.trim() || null,
    }
    createRfq({
      buyerId,
      buyerName,
      productCategory,
      title: title.trim(),
      spec,
      sellers: candidateSellers.filter((seller) => selectedSellerIds.includes(seller.sellerId)),
    })
    onDone()
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
          Title
          <Input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
            Variety
            <Input value={variety} onChange={(event) => setVariety(event.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
            Grade / spec
            <Input value={grade} onChange={(event) => setGrade(event.target.value)} />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
            Quantity per shipment (MT)
            <Input type="number" min={0} value={quantityMt} onChange={(event) => setQuantityMt(event.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
            Monthly volume (MT)
            <Input
              type="number"
              min={0}
              value={monthlyVolumeMt}
              onChange={(event) => setMonthlyVolumeMt(event.target.value)}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
            Packaging
            <Input
              placeholder="e.g. 20kg cartons"
              value={packaging}
              onChange={(event) => setPackaging(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
            Units per carton
            <Input
              type="number"
              min={0}
              value={unitsPerCarton}
              onChange={(event) => setUnitsPerCarton(event.target.value)}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
            Container type
            <Input
              placeholder="e.g. 40ft reefer"
              value={containerType}
              onChange={(event) => setContainerType(event.target.value)}
            />
          </label>
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
        </div>

        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
          Destination port
          <Input value={destinationPort} onChange={(event) => setDestinationPort(event.target.value)} />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
            Shipping window — from
            <Input
              type="date"
              value={shippingWindowFrom}
              onChange={(event) => setShippingWindowFrom(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
            Shipping window — to
            <Input type="date" value={shippingWindowTo} onChange={(event) => setShippingWindowTo(event.target.value)} />
          </label>
        </div>

        <label className="flex items-center gap-2 text-[13px] font-medium text-foreground">
          <Checkbox checked={splitShipment} onCheckedChange={(value) => setSplitShipment(value === true)} />
          Split shipments are OK
        </label>

        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
          Payment term preference
          <Input
            placeholder="e.g. 30% advance, 70% on B/L"
            value={paymentTermPreference}
            onChange={(event) => setPaymentTermPreference(event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
          Notes
          <Textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>

        <div className="flex flex-col gap-1.5">
          <p className="text-[13px] font-medium text-foreground">Send to</p>
          <div className="flex flex-col gap-1 rounded-2xl bg-muted p-2">
            {candidateSellers.length === 0 ? (
              <p className="px-2 py-1.5 text-[12px] text-muted-foreground">
                No sellers found for this category yet.
              </p>
            ) : (
              candidateSellers.map((seller) => (
                <label
                  key={seller.sellerId}
                  className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-[13px] text-foreground hover:bg-card"
                >
                  <Checkbox
                    checked={selectedSellerIds.includes(seller.sellerId)}
                    onCheckedChange={() => toggleSeller(seller.sellerId)}
                  />
                  <span className="min-w-0 flex-1 truncate">{seller.sellerName}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{seller.listingTitle}</span>
                </label>
              ))
            )}
          </div>
        </div>

        {error ? <p className="text-[13px] font-medium text-destructive">{error}</p> : null}
      </div>

      <DialogFooter>
        <Button onClick={submit}>Send RFQ to {selectedSellerIds.length || ""} sellers</Button>
      </DialogFooter>
    </>
  )
}

export { RfqDialog }
