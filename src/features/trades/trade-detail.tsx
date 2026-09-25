"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  BadgeCheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FileWarningIcon,
  LayoutGridIcon,
  ListOrderedIcon,
  PackageIcon,
  ShipIcon,
  ThermometerIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import * as W from "@/features/tradechain/demo-world"
import {
  STAGE_DOMAIN,
  cutoffClock,
  cutoffs,
  documentsFor,
  exceptionStages,
  idSpine,
  isColdChain,
  journeyLegs,
  openGates,
  paymentClock,
  payoutClock,
  quantityLadder,
  shelfLifeClock,
  stageStateFor,
  temperatureTrace,
  tradeSetpoint,
  type Clock,
  type TradeDomain,
} from "@/features/tradechain/trade-file"
import { CarrierLogo } from "@/features/marketplace/carrier-logo"
import { IncotermInfoButton } from "@/features/marketplace/incoterm-picker"
import { PAGE_TABS_SPACE, PageTabs, type PageTab } from "@/features/dashboard/page-tabs"
import type { TradePerspective } from "@/features/trades/trade-access"
import { LegTable, TemperatureChart } from "@/features/trades/temperature-chart"
import {
  SCENARIO_TONE,
  TRADE_STATUS_LABEL,
  TRADE_STATUS_TONE,
  dueLabel,
  formatDay,
  formatStamp,
  hoursUntil,
  pad2,
  portName,
  scenarioMeta,
} from "@/features/trades/trade-format"
import { ClockInfo, DocumentsInfo, ExcursionInfo, QuantityInfo, ScenarioInfo, SpineInfo } from "@/features/trades/trade-info"
import { LegStepper, PhaseStepper } from "@/features/trades/trade-journey"
import { DocumentRows, StagesPanel } from "@/features/trades/trade-stage-panel"
import { Dot, EmptyNote, Facts, Mono, Panel, Pill, Status, TEXT_TONE } from "@/features/trades/trade-ui"

type Tab = "overview" | "stages" | TradeDomain

const TABS: PageTab<Tab>[] = [
  { value: "overview", label: "Overview", icon: LayoutGridIcon },
  { value: "stages", label: "Stages", icon: ListOrderedIcon },
  { value: "shipment", label: "Shipment", icon: ShipIcon },
  { value: "quality", label: "Quality", icon: BadgeCheckIcon },
  { value: "finance", label: "Finance", icon: WalletIcon },
]

const usd = (value: number) => `USD ${Math.round(value).toLocaleString("en-US")}`

/* ── shared bits ─────────────────────────────────────────────────────── */

const BAR_TONE: Record<Clock["tone"], string> = {
  ok: "bg-amama-deep",
  warn: "bg-status-warning",
  crit: "bg-destructive",
  muted: "bg-border",
}

function ClockTile({ clock }: { clock: Clock }) {
  return (
    <div className="min-w-0 rounded-[18px] border border-border bg-card px-3 py-3 sm:rounded-[20px] sm:px-4 sm:py-3.5">
      <p className="flex items-center gap-0.5 truncate text-[11.5px] text-muted-foreground sm:text-[12.5px]">
        {clock.label}
        <ClockInfo label={clock.label} />
      </p>
      <p className={cn("mt-1 truncate text-[15px] leading-tight font-semibold tracking-tight tabular-nums sm:text-[20px]", TEXT_TONE[clock.tone === "ok" ? "brand" : clock.tone])}>
        {clock.value}
      </p>
      {clock.progress !== null ? (
        <span className="mt-2 block h-1 overflow-hidden rounded-full bg-muted">
          <span className={cn("block h-full rounded-full", BAR_TONE[clock.tone])} style={{ width: `${Math.round(clock.progress * 100)}%` }} />
        </span>
      ) : null}
      <p className="mt-1.5 hidden truncate text-[12px] text-muted-foreground sm:block" title={clock.detail}>
        {clock.detail}
      </p>
    </div>
  )
}

function DomainDocuments({ trade, domain }: { trade: W.Trade; domain: TradeDomain }) {
  const documents = documentsFor(trade, domain)
  if (documents.length === 0) return null
  const open = documents.filter((document) => document.requirement === "M" && document.status !== "VERIFIED" && document.status !== "NA")
  return (
    <Panel
      title="Documents"
      info={<DocumentsInfo />}
      action={
        <span className={cn("text-[12px]", open.length > 0 ? "font-medium text-status-warning" : "text-muted-foreground")}>
          {open.length > 0 ? `${open.length} open` : `${documents.length} on file`}
        </span>
      }
      flush
    >
      <DocumentRows documents={documents} />
    </Panel>
  )
}

/* ── overview ─────────────────────────────────────────────────────────── */

type Attention = { key: string; icon: LucideIcon; tone: "warn" | "crit"; title: string; meta: string; tab: Tab; stage?: W.StageNo }

function attentionFor(trade: W.Trade): Attention[] {
  const items: Attention[] = []
  for (const document of trade.status === "closed" ? [] : openGates(trade)) {
    items.push({
      key: document.id,
      icon: FileWarningIcon,
      tone: document.status === "MISSING" || document.status === "REJECTED" ? "crit" : "warn",
      title: document.name,
      meta: `Stage ${pad2(document.stage)} · ${document.status.toLowerCase()}`,
      tab: STAGE_DOMAIN[document.stage],
    })
  }
  for (const excursion of W.EXCURSIONS.filter((entry) => entry.tradeId === trade.id)) {
    items.push({
      key: excursion.id,
      icon: ThermometerIcon,
      tone: excursion.shelfLifeDebitDays >= 3 ? "crit" : "warn",
      title: `${excursion.peakTempC} °C vs ${excursion.setpointC} °C`,
      meta: `${excursion.durationMin} min · −${excursion.shelfLifeDebitDays} d shelf life`,
      tab: "shipment",
    })
  }
  for (const record of exceptionStages(trade)) {
    items.push({
      key: record.id,
      icon: AlertTriangleIcon,
      tone: record.scenario === "C" ? "crit" : "warn",
      title: `${pad2(record.stage)} ${W.stageByNo(record.stage).short}`,
      meta: `${record.scenario} · ${scenarioMeta(record.scenario).label}`,
      tab: "stages",
      stage: record.stage,
    })
  }
  return items
}

function OverviewTab({
  trade,
  perspective,
  partyIds,
  onNavigate,
}: {
  trade: W.Trade
  perspective: TradePerspective
  partyIds: string[]
  onNavigate: (tab: Tab, stage?: W.StageNo) => void
}) {
  const stage = W.stageByNo(trade.currentStage)
  const record = W.stageRecord(trade.id, trade.currentStage)
  const owner = record ? W.userById(record.ownerId) : undefined
  const closed = trade.status === "closed"
  const due = closed ? null : dueLabel(trade.nextAction.dueAt)
  const kam = W.userById(trade.kamId)
  const attention = attentionFor(trade)
  const product = W.productById(trade.productId)
  const variant = W.variantById(trade.variantId)

  return (
    <div className="flex flex-col gap-4">
      <Panel
        title={closed ? "Closed" : "Now"}
        action={
          <button
            type="button"
            onClick={() => onNavigate("stages", trade.currentStage)}
            className="inline-flex items-center gap-0.5 text-[12px] font-medium text-amama-deep hover:underline"
          >
            Open stage
            <ChevronRightIcon aria-hidden className="size-3.5" />
          </button>
        }
      >
        <Facts
          columns={4}
          rows={[
            {
              label: "Stage",
              value: (
                <span>
                  <span className="font-mono text-amama-deep">{pad2(stage.n)}</span> {stage.short}
                </span>
              ),
            },
            {
              label: "Scenario",
              info: <ScenarioInfo scenario={record?.scenario} />,
              value: record ? (
                <Pill tone={SCENARIO_TONE[record.scenario]}>
                  {record.scenario} · {scenarioMeta(record.scenario).label}
                </Pill>
              ) : (
                "—"
              ),
            },
            { label: "Owner", value: owner ? owner.name : W.roleById(stage.ownerRole).label },
            {
              label: "Due",
              value: due ? (
                <span className="inline-flex items-center gap-1.5">
                  <Pill tone={due.tone === "muted" ? "brand" : due.tone}>{due.text}</Pill>
                </span>
              ) : (
                "Settled"
              ),
            },
          ]}
        />
        {!closed ? (
          <p className="mt-4 border-t border-border pt-3.5 text-[13.5px] font-medium text-foreground">
            <span className="me-2 text-[12px] font-normal text-muted-foreground">Next</span>
            {trade.nextAction.label}
          </p>
        ) : null}
      </Panel>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[shelfLifeClock(trade), cutoffClock(trade), perspective === "seller" ? payoutClock(trade, partyIds) : paymentClock(trade)].map(
          (clock) => (
            <ClockTile key={clock.label} clock={clock} />
          )
        )}
      </div>

      <Panel title="Journey" action={<span className="text-[12px] text-muted-foreground tabular-nums">Stage {trade.currentStage} of 16</span>}>
        <div className="overflow-x-auto">
          <div className="min-w-[380px]">
            <PhaseStepper trade={trade} onOpenStage={(next) => onNavigate("stages", next)} />
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
        <Panel title="Contract">
          <Facts
            columns={2}
            rows={[
              { label: "Product", value: `${product?.label} · ${variant?.label}` },
              { label: "Quantity", value: `${trade.qtyContractedMt} MT` },
              { label: "Route", value: `${portName(trade.portOfLoading)} → ${portName(trade.portOfDischarge)}` },
              { label: "Incoterm", value: trade.incoterm, info: <IncotermInfoButton /> },
              { label: "Window", value: `${formatDay(trade.deliveryWindow[0])} – ${formatDay(trade.deliveryWindow[1])}` },
              ...(perspective === "internal"
                ? [{ label: "Buyer", value: W.buyerById(trade.buyerId)?.company ?? "—" }]
                : perspective === "seller"
                  ? [{ label: "Destination", value: trade.destination }]
                  : []),
              { label: perspective === "internal" ? "KAM" : "AMAMA contact", value: kam?.name ?? "—" },
              { label: "Spec", value: trade.spec, wide: true },
            ]}
          />
        </Panel>

        <Panel
          title="Attention"
          action={
            attention.length > 0 ? (
              <span className="text-[12px] font-medium text-status-warning tabular-nums">{attention.length}</span>
            ) : null
          }
          flush={attention.length > 0}
        >
          {attention.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">All clear</p>
          ) : (
            <ul className="divide-y divide-border">
              {attention.slice(0, 6).map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => onNavigate(item.tab, item.stage)}
                    className="flex w-full items-center gap-3 px-5 py-2.5 text-start transition-colors hover:bg-muted"
                  >
                    <item.icon aria-hidden className={cn("size-4 shrink-0", item.tone === "crit" ? "text-destructive" : "text-status-warning")} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-foreground">{item.title}</span>
                      <span className="block truncate text-[12px] text-muted-foreground">{item.meta}</span>
                    </span>
                    <ChevronRightIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}

/* ── shipment ─────────────────────────────────────────────────────────── */

const MILESTONE_TONE: Record<W.ShipmentMilestone["state"], "ok" | "warn" | "crit" | "muted"> = {
  complete: "ok",
  due: "warn",
  late: "crit",
  pending: "muted",
}

function Disclosure({ label, count, children }: { label: string; count?: number; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  return (
    <section className="overflow-hidden rounded-[20px] border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-start transition-colors hover:bg-muted/60"
      >
        <span className="text-[14px] font-semibold text-foreground">
          {label}
          {count !== undefined ? <span className="ms-1.5 font-normal text-muted-foreground tabular-nums">{count}</span> : null}
        </span>
        <ChevronDownIcon aria-hidden className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open ? <div className="border-t border-border">{children}</div> : null}
    </section>
  )
}

/** When each cut-off's own step actually happened, if it has. */
function cutoffMetAt(trade: W.Trade, label: string): string | null {
  const container = W.containerForTrade(trade.id)
  const milestone = (key: string) => W.shipmentForTrade(trade.id)?.milestones.find((entry) => entry.key === key)?.actualAt ?? null
  const gatedIn = trade.currentStage > 13 || trade.status === "closed" || W.stageRecord(trade.id, 13)?.state === "complete"
  if (label === "VGM") return container?.vgmFiledAt || milestone("vgm") || (gatedIn ? "done" : null)
  if (label === "Gate-in") return container?.gateInAt || milestone("gatein") || (gatedIn ? "done" : null)
  return milestone("si") || (gatedIn ? "done" : null)
}

function CutoffTiles({ trade }: { trade: W.Trade }) {
  const list = cutoffs(trade)
  if (list.length === 0) return null
  return (
    <div className="grid grid-cols-3 gap-3">
      {list.map((cutoff) => {
        const metAt = cutoffMetAt(trade, cutoff.label)
        const hours = hoursUntil(cutoff.at)
        const value = metAt
          ? "Done"
          : hours < 0
            ? "Missed"
            : hours < 1
              ? `${Math.round(hours * 60)} min`
              : hours < 48
                ? `${hours.toFixed(1)} h`
                : `${Math.round(hours / 24)} d`
        const tone = metAt ? "ok" : hours < 2 ? "crit" : hours < 24 ? "warn" : "brand"
        return (
          <div key={cutoff.label} className="rounded-[16px] border border-border bg-card px-3.5 py-3">
            <p className="truncate text-[12px] text-muted-foreground">{cutoff.label === "Shipping instructions" ? "SI cut-off" : `${cutoff.label} cut-off`}</p>
            <p className={cn("text-[15px] font-semibold tabular-nums", TEXT_TONE[tone])}>{value}</p>
            <p className="truncate text-[11.5px] text-muted-foreground tabular-nums">
              {metAt && metAt !== "done" ? `At ${formatStamp(metAt)}` : `By ${formatStamp(cutoff.at)}`}
            </p>
          </div>
        )
      })}
    </div>
  )
}

function ColdChainPanel({ trade }: { trade: W.Trade }) {
  const product = W.productById(trade.productId)
  if (!isColdChain(trade)) {
    return (
      <Panel title="Cold chain">
        <p className="text-[13px] text-muted-foreground">Ambient cargo · {product?.setpointC} °C · no temperature trail</p>
      </Panel>
    )
  }
  const trace = temperatureTrace(trade)
  if (!trace) {
    return (
      <Panel title="Cold chain">
        <p className="text-[13px] text-muted-foreground">Starts at harvest</p>
      </Panel>
    )
  }
  const excursions = W.EXCURSIONS.filter((excursion) => excursion.tradeId === trade.id)
  const last = trace[trace.length - 1]
  const debit = excursions.reduce((sum, excursion) => sum + excursion.shelfLifeDebitDays, 0)

  return (
    <>
      <Panel
        title="Temperature"
        action={
          <span className="flex items-center gap-3 text-[12px] text-muted-foreground tabular-nums">
            <span>
              Now <span className="font-semibold text-foreground">{last.tempC.toFixed(1)} °C</span>
            </span>
            <span>
              Set <span className="font-semibold text-foreground">{tradeSetpoint(trade)} °C</span>
            </span>
          </span>
        }
      >
        <TemperatureChart points={trace} />
      </Panel>

      <Panel
        title="Excursions"
        info={<ExcursionInfo />}
        action={
          excursions.length > 0 ? (
            <span className="text-[12px] font-medium text-destructive tabular-nums">−{debit.toFixed(1)} d</span>
          ) : null
        }
        flush={excursions.length > 0}
      >
        {excursions.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">None</p>
        ) : (
          <ul className="divide-y divide-border">
            {excursions.map((excursion) => (
              <li key={excursion.id} className="grid grid-cols-2 gap-x-4 gap-y-1 px-5 py-3 sm:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))]">
                <span className="col-span-2 min-w-0 sm:col-span-1">
                  <span className="block text-[13px] font-medium text-foreground">{formatStamp(excursion.startedAt)}</span>
                  <span className="block truncate text-[12px] text-muted-foreground" title={excursion.cause}>
                    {excursion.cause}
                  </span>
                </span>
                <KeyValue label="Peak" value={`${excursion.peakTempC} °C`} />
                <KeyValue label="Duration" value={`${excursion.durationMin} min`} />
                <KeyValue label="Shelf life" value={<span className={excursion.shelfLifeDebitDays >= 3 ? "text-destructive" : "text-status-warning"}>−{excursion.shelfLifeDebitDays} d</span>} />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Disclosure label="Readings by leg">
        <LegTable points={trace} />
      </Disclosure>
    </>
  )
}

function KeyValue({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <span className="min-w-0">
      <span className="block text-[11.5px] text-muted-foreground">{label}</span>
      <span className="block truncate text-[13px] font-medium text-foreground tabular-nums">{value}</span>
    </span>
  )
}

function ShipmentTab({ trade }: { trade: W.Trade }) {
  const shipment = W.shipmentForTrade(trade.id)
  const container = W.containerForTrade(trade.id)
  const carrier = shipment?.carrier ?? container?.line ?? null
  const harvested = stageStateFor(trade, 3) !== "pending"

  return (
    <div className="flex flex-col gap-4">
      <Panel title="Route">
        <LegStepper legs={journeyLegs(trade)} harvested={harvested} alert={trade.status === "blocked"} />
      </Panel>

      <CutoffTiles trade={trade} />

      <Panel
        title="Booking"
        action={carrier ? <CarrierLogo carrier={carrier} mode="ocean" className="size-5" /> : null}
      >
        {shipment || container ? (
          <Facts
            columns={4}
            rows={[
              { label: "Carrier", value: carrier ?? "—" },
              { label: "Vessel", value: shipment ? `${shipment.vessel} ${shipment.voyage}` : `${container?.vessel} ${container?.voyage}` },
              { label: "Booking", value: <Mono>{shipment?.bookingRef ?? container?.bookingRef}</Mono> },
              { label: "B/L", value: shipment?.blNo ? <Mono>{shipment.blNo}</Mono> : "After sailing" },
              { label: "Container", value: container ? <Mono>{container.id}</Mono> : "—" },
              { label: "Equipment", value: container?.type ?? "—" },
              { label: "ETD", value: formatStamp(shipment?.atd ?? shipment?.etd ?? container?.etd) },
              {
                label: shipment?.ata ? "Arrived" : "ETA",
                value: (
                  <span>
                    {formatStamp(shipment?.ata ?? shipment?.eta ?? container?.eta)}
                    {shipment && shipment.etaVarianceHrs > 0 ? (
                      <span className="ms-1.5 text-[12px] text-status-warning">+{shipment.etaVarianceHrs} h</span>
                    ) : null}
                  </span>
                ),
              },
            ]}
          />
        ) : (
          <p className="text-[13px] text-muted-foreground">Not booked · stage 09</p>
        )}
      </Panel>

      <ColdChainPanel trade={trade} />

      {shipment && shipment.milestones.length > 0 ? (
        <Disclosure label="Milestones" count={shipment.milestones.length}>
          <ul className="divide-y divide-border">
            {shipment.milestones.map((milestone) => (
              <li key={milestone.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 px-5 py-2.5 sm:grid-cols-[minmax(0,1fr)_9rem_9rem]">
                <span className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-foreground">
                  <Dot tone={MILESTONE_TONE[milestone.state]} />
                  <span className="truncate">{milestone.label}</span>
                </span>
                <KeyValue label="Plan" value={formatStamp(milestone.plannedAt)} />
                <span className="col-start-2 sm:col-start-auto">
                  <KeyValue label="Actual" value={milestone.actualAt ? formatStamp(milestone.actualAt) : milestone.state === "late" ? "Late" : "—"} />
                </span>
              </li>
            ))}
          </ul>
        </Disclosure>
      ) : null}

      <DomainDocuments trade={trade} domain="shipment" />
    </div>
  )
}

/* ── quality ──────────────────────────────────────────────────────────── */

const QC_TONE: Record<W.QcDecision, "ok" | "warn" | "crit"> = { PASS: "ok", CONDITIONAL: "warn", HOLD: "warn", REJECT: "crit" }

function QualityTab({ trade, partyIds }: { trade: W.Trade; partyIds: string[] }) {
  const ladder = quantityLadder(trade)
  const lots = W.lotsForTrade(trade.id)
  const pallets = W.palletsForTrade(trade.id)
  const spine = idSpine(trade)
  const [openLot, setOpenLot] = React.useState<string | null>(null)

  return (
    <div className="flex flex-col gap-4">
      <Panel title="Quantities" info={<QuantityInfo />}>
        <ol className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-border bg-border sm:grid-cols-4 lg:grid-cols-7">
          {ladder.map((step, index) => {
            const previous = ladder.slice(0, index).reverse().find((item) => item.mt !== null)
            const gap = step.mt !== null && previous?.mt != null ? step.mt - previous.mt : 0
            return (
              <li key={step.label} className="bg-card px-3 py-2.5">
                <p className="text-[11.5px] text-muted-foreground">{step.label}</p>
                <p className={cn("text-[15px] font-semibold tabular-nums", step.mt === null ? "text-muted-foreground" : "text-foreground")}>
                  {step.mt === null ? "—" : step.mt}
                  {step.mt !== null ? <span className="ms-0.5 text-[11px] font-normal text-muted-foreground">MT</span> : null}
                </p>
                {gap < -0.01 ? <p className="text-[11px] font-medium text-status-warning tabular-nums">{gap.toFixed(1)}</p> : null}
              </li>
            )
          })}
        </ol>
      </Panel>

      <Panel title="Lots" action={<span className="text-[12px] text-muted-foreground tabular-nums">{lots.length}</span>} flush={lots.length > 0}>
        {lots.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">Created at stage 04</p>
        ) : (
          <ul className="divide-y divide-border">
            {lots.map((lot) => {
              const seller = W.sellerById(lot.sellerId)
              const qc = W.qcRecordById(lot.qcRecordId)
              const open = openLot === lot.id
              return (
                <li key={lot.id}>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenLot(open ? null : lot.id)}
                    className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-3 text-start transition-colors hover:bg-muted sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_6rem_6.5rem_auto]"
                  >
                    <span className="min-w-0">
                      <Mono className="block truncate font-semibold text-foreground">{lot.id}</Mono>
                      <span className="block truncate text-[12px] text-muted-foreground">
                        {seller?.entity}
                        {partyIds.includes(lot.sellerId) ? " · You" : ""}
                      </span>
                    </span>
                    <span className="hidden sm:block">
                      <KeyValue label="Harvested" value={formatDay(lot.harvestedAt)} />
                    </span>
                    <span className="hidden sm:block">
                      <KeyValue label="Accepted" value={`${(lot.qtyAcceptedKg / 1000).toFixed(2)} MT`} />
                    </span>
                    <Status tone={QC_TONE[lot.qcDecision]} className="justify-self-end sm:justify-self-start">
                      {lot.qcDecision === "CONDITIONAL" ? "Conditional" : lot.qcDecision === "PASS" ? "Pass" : lot.qcDecision === "HOLD" ? "Hold" : "Reject"}
                    </Status>
                    <ChevronDownIcon aria-hidden className={cn("hidden size-4 text-muted-foreground transition-transform sm:block", open && "rotate-180")} />
                  </button>
                  {open && qc ? (
                    <div className="border-t border-border bg-muted/40 px-5 py-3">
                      <table className="w-full text-[12.5px]">
                        <thead>
                          <tr className="text-left text-[11.5px] text-muted-foreground">
                            <th className="py-1 pe-3 font-normal">Measure</th>
                            <th className="py-1 pe-3 text-end font-normal">Result</th>
                            <th className="py-1 text-end font-normal">Spec</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {qc.measurements.map((measurement) => (
                            <tr key={measurement.label}>
                              <td className="py-1.5 pe-3 text-foreground">{measurement.label}</td>
                              <td className={cn("py-1.5 pe-3 text-end font-semibold tabular-nums", measurement.pass ? "text-foreground" : "text-destructive")}>
                                {measurement.value}
                              </td>
                              <td className="py-1.5 text-end text-muted-foreground tabular-nums">{measurement.spec}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="mt-2 text-[11.5px] text-muted-foreground">
                        {W.userById(qc.inspectorId)?.name} · {formatStamp(qc.inspectedAt)} · n={qc.sampleSize} · {qc.photos} photos
                      </p>
                      {lot.qcNote ? <p className="mt-1 text-[12px] text-foreground">{lot.qcNote}</p> : null}
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      {pallets.length > 0 ? (
        <Panel title="Pallets" action={<span className="text-[12px] text-muted-foreground tabular-nums">{pallets.length}</span>}>
          <ul className="grid grid-cols-4 gap-1.5 sm:grid-cols-5 lg:grid-cols-10">
            {pallets.map((pallet) => (
              <li
                key={pallet.id}
                title={pallet.note ?? `${pallet.cartons} ctn · ${pallet.netKg} kg · ${pallet.pulpTempAtPackC} °C`}
                className={cn(
                  "rounded-[10px] border px-2 py-1.5 text-center font-mono text-[11px] tabular-nums",
                  pallet.qcResult === "approved" ? "border-border text-foreground" : "border-status-warning/40 bg-status-warning/5 text-status-warning"
                )}
              >
                {pallet.id.split("-").pop()}
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Panel title="Traceability" info={<SpineInfo />}>
        <ol className="flex flex-wrap items-center gap-1.5">
          {spine.map((link, index) => (
            <li key={link.label} className="flex items-center gap-1.5">
              {index > 0 ? <ChevronRightIcon aria-hidden className="size-3.5 text-muted-foreground" /> : null}
              <span
                title={link.value ?? undefined}
                className={cn(
                  "max-w-[13rem] rounded-[10px] border px-2.5 py-1.5",
                  link.value ? "border-border bg-card" : "border-dashed border-border text-muted-foreground"
                )}
              >
                <span className="block text-[10.5px] text-muted-foreground">{link.label}</span>
                <Mono className="block truncate text-[11.5px]">{link.value ?? "—"}</Mono>
              </span>
            </li>
          ))}
        </ol>
      </Panel>

      <DomainDocuments trade={trade} domain="quality" />
    </div>
  )
}

/* ── finance ──────────────────────────────────────────────────────────── */

function FinanceTab({ trade, perspective, partyIds }: { trade: W.Trade; perspective: TradePerspective; partyIds: string[] }) {
  const fulfilment = W.fulfilmentForTrade(trade.id)
  const shipment = W.shipmentForTrade(trade.id)
  const settled = W.stageRecord(trade.id, 16)?.state === "complete" || Boolean(fulfilment?.balanceReceivedAt)
  const value = trade.qtyContractedMt * trade.priceUsdPerMt

  if (perspective === "seller") {
    const mine = W.lotsForTrade(trade.id).filter((lot) => partyIds.includes(lot.sellerId))
    const acceptedMt = mine.reduce((sum, lot) => sum + lot.qtyAcceptedKg, 0) / 1000
    const payout = payoutClock(trade, partyIds)
    return (
      <div className="flex flex-col gap-4">
        <Panel title="Payout" info={<ClockInfo label="Your payout" />}>
          <Facts
            columns={3}
            rows={[
              { label: "Status", value: <span className={TEXT_TONE[payout.tone === "ok" ? "ok" : payout.tone]}>{payout.value}</span> },
              { label: "Accepted", value: mine.length > 0 ? `${acceptedMt.toFixed(2)} MT` : "—" },
              { label: "Lots", value: mine.length || "—" },
            ]}
          />
        </Panel>
        <DomainDocuments trade={trade} domain="finance" />
      </div>
    )
  }

  const rows: { label: string; amount: number | null; date: string | null; state: "done" | "due" | "open" }[] = [
    {
      label: "Advance",
      amount: fulfilment?.advanceReceivedUsd || null,
      date: fulfilment?.advanceReceivedAt ?? null,
      state: fulfilment?.advanceReceivedAt ? "done" : "open",
    },
    {
      label: "Balance",
      amount: fulfilment?.balanceDueUsd ?? null,
      date: fulfilment?.balanceReceivedAt ?? fulfilment?.balanceDueAt ?? null,
      state: settled ? "done" : fulfilment?.balanceDueAt ? "due" : "open",
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <Panel title="Terms">
        <Facts
          columns={4}
          rows={[
            { label: "Value", value: usd(value) },
            { label: "Price", value: `${usd(trade.priceUsdPerMt)} / MT` },
            { label: "Incoterm", value: trade.incoterm, info: <IncotermInfoButton /> },
            { label: "Payment", value: trade.paymentTerms },
          ]}
        />
      </Panel>

      <Panel title="Payments" info={<ClockInfo label="Payment" />} flush>
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_10rem_10rem_6rem]">
              <span className="text-[13px] font-medium text-foreground">{row.label}</span>
              <span className="hidden sm:block">
                <KeyValue label="Amount" value={row.amount ? usd(row.amount) : "—"} />
              </span>
              <span className="hidden sm:block">
                <KeyValue label={row.state === "done" ? "Received" : "Due"} value={row.date ? formatDay(row.date) : "—"} />
              </span>
              <Status tone={row.state === "done" ? "ok" : row.state === "due" ? "warn" : "muted"} className="justify-self-end">
                {row.state === "done" ? "Received" : row.state === "due" ? "Due" : "Open"}
              </Status>
            </li>
          ))}
        </ul>
      </Panel>

      {perspective === "internal" && shipment && shipment.charges.length > 0 ? (
        <Panel
          title="Freight"
          action={<span className="text-[12px] text-muted-foreground">{shipment.freightTerms}</span>}
          flush
        >
          <ul className="divide-y divide-border">
            {shipment.charges.map((charge) => (
              <li key={charge.code} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 px-5 py-2.5 sm:grid-cols-[minmax(0,1fr)_6rem_6rem_7rem]">
                <span className="min-w-0 truncate text-[13px] text-foreground">{charge.label}</span>
                <span className="hidden text-[12px] text-muted-foreground sm:block">{charge.payer}</span>
                <span className="hidden text-[12px] text-muted-foreground capitalize sm:block">{charge.status}</span>
                <span className="text-end text-[13px] font-semibold text-foreground tabular-nums">{usd(charge.amountUsd)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <DomainDocuments trade={trade} domain="finance" />
    </div>
  )
}

/* ── page ─────────────────────────────────────────────────────────────── */

function Detail({
  trade,
  perspective,
  basePath,
  partyIds,
}: {
  trade: W.Trade
  perspective: TradePerspective
  basePath: string
  partyIds: string[]
}) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const tab: Tab = TABS.some((option) => option.value === tabParam) ? (tabParam as Tab) : "overview"
  const stageParam = Number(searchParams.get("stage"))
  const stage = (stageParam >= 1 && stageParam <= 16 ? stageParam : trade.currentStage) as W.StageNo

  const navigate = (next: Tab, nextStage?: W.StageNo) => {
    const params = new URLSearchParams(searchParams.toString())
    if (next === "overview") params.delete("tab")
    else params.set("tab", next)
    if (next === "stages") params.set("stage", String(nextStage ?? stage))
    else params.delete("stage")
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  const product = W.productById(trade.productId)
  const variant = W.variantById(trade.variantId)

  return (
    <div className={PAGE_TABS_SPACE}>
      <Link
        href={basePath}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon aria-hidden className="size-4" />
        Trades
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h1 className="text-[26px] leading-tight font-bold tracking-tight">
            {product?.label} · {variant?.label}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[13px] text-muted-foreground">
            <Mono className="text-[12.5px] text-foreground">{trade.id}</Mono>
            <span aria-hidden>·</span>
            <span>{trade.qtyContractedMt} MT</span>
            <span aria-hidden>·</span>
            <span>
              {portName(trade.portOfLoading)} → {portName(trade.portOfDischarge)}
            </span>
          </p>
        </div>
        <Status tone={TRADE_STATUS_TONE[trade.status]} className="mt-1.5">
          {TRADE_STATUS_LABEL[trade.status]}
        </Status>
      </div>

      <PageTabs label="Trade sections" className="mt-5" tabs={TABS} value={tab} onChange={(next) => navigate(next)} />

      <div className="mt-4">
        {tab === "overview" ? <OverviewTab trade={trade} perspective={perspective} partyIds={partyIds} onNavigate={navigate} /> : null}
        {tab === "stages" ? (
          <StagesPanel trade={trade} perspective={perspective} selected={stage} onSelect={(next) => navigate("stages", next)} />
        ) : null}
        {tab === "shipment" ? <ShipmentTab trade={trade} /> : null}
        {tab === "quality" ? <QualityTab trade={trade} partyIds={partyIds} /> : null}
        {tab === "finance" ? <FinanceTab trade={trade} perspective={perspective} partyIds={partyIds} /> : null}
      </div>
    </div>
  )
}

function TradeDetail({
  trade,
  perspective,
  basePath,
  partyIds,
}: {
  trade: W.Trade | undefined
  perspective: TradePerspective
  basePath: string
  partyIds: string[]
}) {
  if (!trade) {
    return (
      <div>
        <Link href={basePath} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon aria-hidden className="size-4" />
          Trades
        </Link>
        <div className="mt-6">
          <EmptyNote>
            <PackageIcon aria-hidden className="mx-auto mb-2 size-5" />
            Trade not found
          </EmptyNote>
        </div>
      </div>
    )
  }
  return (
    <React.Suspense fallback={<div className="h-64 animate-pulse rounded-[20px] bg-muted" />}>
      <Detail trade={trade} perspective={perspective} basePath={basePath} partyIds={partyIds} />
    </React.Suspense>
  )
}

export { TradeDetail }
