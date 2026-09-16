"use client"

import * as React from "react"
import { ArrowRightIcon, HandshakeIcon, PlusIcon, ShipIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { GateBar } from "@/features/dashboard/dashboard-ui"
import { ADMIN_SELECTED_CLASS, AdminEmptyState, AdminPanel } from "@/features/admin/admin-ui"
import { useKamIdentity } from "@/features/admin/kam-identity"
import {
  DEAL_STAGE_LABELS,
  DEAL_STAGE_ORDER,
  addShipment,
  advanceStage,
  dealStageProgress,
  updateCompliance,
  updateContracting,
  updateCosting,
  updatePayment,
  updateShipment,
  useDeals,
  type Deal,
  type ShipmentStatus,
} from "@/features/marketplace/deal-store"

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount)
}

const shipmentStatusLabels: Record<ShipmentStatus, string> = {
  booked: "Booked",
  "in-transit": "In transit",
  arrived: "Arrived",
  delayed: "Delayed",
}

/**
 * The KAM's own queue — every active deal assigned to *them*, and nothing
 * else. Assignment itself happens on the master admin side (see
 * `master-deals-view.tsx`); this is where the KAM actually drives one
 * forward once it lands on their desk.
 */
function KamDealsView() {
  const identity = useKamIdentity()
  const deals = useDeals()
  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  const myDeals = React.useMemo(
    () => deals.filter((deal) => deal.status === "active" && deal.assignedKamId === identity?.id),
    [deals, identity?.id]
  )
  const selected = myDeals.find((deal) => deal.id === selectedId) ?? null

  return (
    <div>
      <h1 className="text-[19px] font-bold tracking-tight">Deals</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Every active deal assigned to you — you&apos;re the point of contact from here through
        payment.
      </p>

      {myDeals.length === 0 ? (
        <AdminEmptyState
          icon={HandshakeIcon}
          title="No deals assigned to you yet"
          description="Once a master admin assigns you a confirmed deal, it'll show up here."
        />
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-[320px_1fr]">
          <ul className="flex flex-col gap-2">
            {myDeals.map((deal) => {
              const progress = dealStageProgress(deal)
              const active = deal.id === selectedId
              return (
                <li key={deal.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(deal.id)}
                    className={cn(
                      "w-full rounded-[16px] border px-4 py-3 text-start transition-colors",
                      active ? ADMIN_SELECTED_CLASS : "border-border bg-card hover:bg-muted/50"
                    )}
                  >
                    <p className="truncate text-[13px] font-semibold">
                      {deal.buyerName} ↔ {deal.sellerName}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 truncate text-[12px]",
                        active ? "text-amama-foreground/80" : "text-muted-foreground"
                      )}
                    >
                      {deal.listingTitle}
                    </p>
                    <p
                      className={cn(
                        "mt-2 text-[11px] font-medium",
                        active ? "text-amama-foreground/80" : "text-muted-foreground"
                      )}
                    >
                      {deal.stage ? DEAL_STAGE_LABELS[deal.stage] : "Starting"}
                    </p>
                    <div className="mt-1.5">
                      <GateBar cleared={progress.cleared} total={progress.total} status={progress.status} />
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>

          {selected ? (
            <DealDetail deal={selected} kamName={identity?.name ?? "KAM"} />
          ) : (
            <div className="flex items-center justify-center rounded-[20px] border border-dashed border-border py-16 text-center text-[13px] text-muted-foreground">
              Pick a deal to manage it.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DealDetail({ deal, kamName }: { deal: Deal; kamName: string }) {
  const progress = dealStageProgress(deal)
  const [advancing, setAdvancing] = React.useState(false)
  const [note, setNote] = React.useState("")

  const advance = () => {
    advanceStage(deal.id, kamName, note.trim() || null)
    setAdvancing(false)
    setNote("")
  }

  const isLastStage = deal.stage === DEAL_STAGE_ORDER[DEAL_STAGE_ORDER.length - 1]

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[20px] border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-[16px] font-bold tracking-tight">{deal.listingTitle}</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {deal.buyerName} (buyer) ↔ {deal.sellerName} (seller)
            </p>
          </div>
          <p className="shrink-0 text-[15px] font-extrabold tabular-nums text-foreground">
            {formatUsd(deal.agreedPricePerTonneUsd)}/t × {deal.agreedQuantityMt} MT
          </p>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-[12px] font-medium text-muted-foreground">
            <span>{deal.stage ? DEAL_STAGE_LABELS[deal.stage] : "Starting"}</span>
            <span>
              {progress.cleared}/{progress.total} stages
            </span>
          </div>
          <div className="mt-1.5">
            <GateBar cleared={progress.cleared} total={progress.total} status={progress.status} />
          </div>
        </div>
      </div>

      {deal.stage === "costing" ? <CostingForm deal={deal} /> : null}
      {deal.stage === "contracting" ? <ContractingForm deal={deal} /> : null}
      {deal.stage === "compliance" ? <ComplianceForm deal={deal} /> : null}
      {deal.stage === "delivered" || deal.stage === "paid" ? <PaymentForm deal={deal} /> : null}

      {/* Shipments live outside the stage switch on purpose — freight often
          gets booked well before the pipeline visually reaches "Shipment
          tracking", so a KAM needs to log it any time the deal is active. */}
      <ShipmentsPanel deal={deal} />

      <AdminPanel
        title="Advance the pipeline"
        action={
          !isLastStage ? (
            <Button size="sm" onClick={() => setAdvancing((value) => !value)}>
              Advance to next stage
              <ArrowRightIcon />
            </Button>
          ) : (
            <span className="text-[13px] font-medium text-amama-deep">Final stage reached</span>
          )
        }
      >
        <div className="flex flex-col gap-4 p-5">
          {advancing ? (
            <div className="flex flex-col gap-2">
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Anything worth logging about this handoff? (optional)"
                rows={2}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={advance}>
                  Confirm advance
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAdvancing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

          {deal.stageHistory.length > 0 ? (
            <ul className={cn("flex flex-col gap-1.5", advancing && "border-t border-border pt-3")}>
              {[...deal.stageHistory].reverse().map((entry, index) => (
                <li key={index} className="text-[12px] text-muted-foreground">
                  <span className="font-medium text-foreground">{DEAL_STAGE_LABELS[entry.stage]}</span> — {entry.by}{" "}
                  ·{" "}
                  {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
                    new Date(entry.at)
                  )}
                  {entry.note ? <span className="block">{entry.note}</span> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </AdminPanel>
    </div>
  )
}

function StageCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <AdminPanel title={title}>
      <div className="flex flex-col gap-3 p-5">{children}</div>
    </AdminPanel>
  )
}

const incotermOptions = ["FOB", "CIF", "CFR", "EXW", "DAP"]
const paymentTermOptions = ["Escrow", "Letter of Credit", "Advance payment", "Open account"]

function CostingForm({ deal }: { deal: Deal }) {
  return (
    <StageCard title="Costing & Invoicing">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
          Incoterm
          <Select
            value={deal.costing.incoterm ?? undefined}
            onValueChange={(value) => updateCosting(deal.id, { incoterm: value as string })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {incotermOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
          Payment term
          <Select
            value={deal.costing.paymentTerm ?? undefined}
            onValueChange={(value) => updateCosting(deal.id, { paymentTerm: value as string })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {paymentTermOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
        Proforma invoice no.
        <Input
          value={deal.costing.proformaInvoiceNo ?? ""}
          onChange={(event) => updateCosting(deal.id, { proformaInvoiceNo: event.target.value })}
          placeholder="PI-2026-0451"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
        Notes
        <Textarea
          value={deal.costing.notes ?? ""}
          onChange={(event) => updateCosting(deal.id, { notes: event.target.value })}
          rows={2}
        />
      </label>
    </StageCard>
  )
}

function ContractingForm({ deal }: { deal: Deal }) {
  return (
    <StageCard title="Contracting">
      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
        Contract reference
        <Input
          value={deal.contracting.contractRef ?? ""}
          onChange={(event) => updateContracting(deal.id, { contractRef: event.target.value })}
          placeholder="CTR-2026-0451"
        />
      </label>
      <label className="flex items-center gap-2.5 text-[13px] font-medium text-foreground">
        <Checkbox
          checked={deal.contracting.signedOff}
          onCheckedChange={(checked) => updateContracting(deal.id, { signedOff: checked === true })}
        />
        Compliance sign-off received
      </label>
      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
        Notes
        <Textarea
          value={deal.contracting.notes ?? ""}
          onChange={(event) => updateContracting(deal.id, { notes: event.target.value })}
          rows={2}
        />
      </label>
    </StageCard>
  )
}

function ComplianceForm({ deal }: { deal: Deal }) {
  const items: { key: keyof Deal["compliance"]; label: string }[] = [
    { key: "phytosanitaryCert", label: "Phytosanitary certificate" },
    { key: "labReport", label: "Lab analysis report" },
    { key: "certificateOfOrigin", label: "Certificate of Origin" },
    { key: "customsDocs", label: "Customs documentation" },
    { key: "freightBooked", label: "Freight booked" },
  ]
  return (
    <StageCard title="Compliance, QC & Logistics">
      <div className="flex flex-col gap-2">
        {items.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2.5 text-[13px] font-medium text-foreground">
            <Checkbox
              checked={deal.compliance[key] === true}
              onCheckedChange={(checked) => updateCompliance(deal.id, { [key]: checked === true })}
            />
            {label}
          </label>
        ))}
      </div>
      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
        Notes
        <Textarea
          value={deal.compliance.notes ?? ""}
          onChange={(event) => updateCompliance(deal.id, { notes: event.target.value })}
          rows={2}
        />
      </label>
    </StageCard>
  )
}

function PaymentForm({ deal }: { deal: Deal }) {
  return (
    <StageCard title="Payment">
      <label className="flex items-center gap-2.5 text-[13px] font-medium text-foreground">
        <Checkbox
          checked={deal.payment.settled}
          onCheckedChange={(checked) =>
            updatePayment(deal.id, {
              settled: checked === true,
              settledAt: checked === true ? new Date().toISOString() : null,
            })
          }
        />
        Payment settled
      </label>
      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
        Notes
        <Textarea
          value={deal.payment.notes ?? ""}
          onChange={(event) => updatePayment(deal.id, { notes: event.target.value })}
          rows={2}
        />
      </label>
    </StageCard>
  )
}

function ShipmentsPanel({ deal }: { deal: Deal }) {
  const [adding, setAdding] = React.useState(false)
  const [carrier, setCarrier] = React.useState("")
  const [documentNumber, setDocumentNumber] = React.useState("")
  const [eta, setEta] = React.useState("")

  const submit = () => {
    if (!carrier.trim()) return
    addShipment(deal.id, {
      carrier: carrier.trim(),
      documentNumber: documentNumber.trim(),
      status: "booked",
      eta: eta || null,
      note: null,
    })
    setCarrier("")
    setDocumentNumber("")
    setEta("")
    setAdding(false)
  }

  return (
    <AdminPanel
      title="Shipments"
      action={
        <Button size="sm" variant="outline" onClick={() => setAdding((value) => !value)}>
          <PlusIcon />
          Add shipment
        </Button>
      }
    >
      <div className="flex flex-col gap-3 p-5">
        {adding ? (
          <div className="grid grid-cols-1 gap-2 rounded-[14px] border border-dashed border-border p-3 sm:grid-cols-3">
            <Input placeholder="Carrier" value={carrier} onChange={(event) => setCarrier(event.target.value)} />
            <Input
              placeholder="BL / AWB no."
              value={documentNumber}
              onChange={(event) => setDocumentNumber(event.target.value)}
            />
            <Input type="date" value={eta} onChange={(event) => setEta(event.target.value)} />
            <Button size="sm" className="sm:col-span-3" onClick={submit}>
              Save shipment
            </Button>
          </div>
        ) : null}

        {deal.shipments.length === 0 ? (
          <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <ShipIcon className="size-4" />
            Nothing booked yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {deal.shipments.map((shipment) => (
              <li key={shipment.id} className="flex flex-wrap items-center gap-2.5 rounded-[14px] border border-border px-3 py-2.5">
                <ShipIcon className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-foreground">{shipment.carrier}</p>
                  <p className="truncate text-[12px] text-muted-foreground">
                    {shipment.documentNumber || "No BL/AWB yet"}
                    {shipment.eta ? ` · ETA ${shipment.eta}` : ""}
                  </p>
                </div>
                <Select
                  value={shipment.status}
                  onValueChange={(value) =>
                    updateShipment(deal.id, shipment.id, { status: value as ShipmentStatus })
                  }
                >
                  <SelectTrigger size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(shipmentStatusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminPanel>
  )
}

export { KamDealsView }
