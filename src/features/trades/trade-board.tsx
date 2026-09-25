"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  AlertTriangleIcon,
  ChevronRightIcon,
  Columns3Icon,
  FileWarningIcon,
  ListIcon,
  SearchIcon,
  ThermometerIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import * as W from "@/features/tradechain/demo-world"
import { currentRecord, exceptionStages, openGates, stageStateFor } from "@/features/tradechain/trade-file"
import { PAGE_TABS_SPACE, PageTabs } from "@/features/dashboard/page-tabs"
import type { TradePerspective } from "@/features/trades/trade-access"
import {
  DOC_STATUS_LABEL,
  DOC_STATUS_TONE,
  SCENARIO_TONE,
  TRADE_STATUS_LABEL,
  TRADE_STATUS_TONE,
  dueLabel,
  pad2,
  scenarioMeta,
} from "@/features/trades/trade-format"
import { ScenarioInfo } from "@/features/trades/trade-info"
import { Dot, EmptyNote, Mono, Pill, StatTile, Status } from "@/features/trades/trade-ui"

type View = "board" | "list"
type Grouping = "phase" | "stage" | "status"

const STAGE_SEGMENT: Record<W.StageState, string> = {
  complete: "bg-amama-deep",
  "in-progress": "bg-foreground",
  blocked: "bg-destructive",
  pending: "bg-border",
}

const STATUS_ORDER: W.TradeStatus[] = ["blocked", "at-risk", "active", "closed"]

const GROUP_ITEMS: Record<Grouping, string> = { phase: "By phase", stage: "By stage", status: "By status" }

const CHAIN_ITEMS: Record<string, string> = {
  all: "Any scenario",
  B: "B · Delay",
  C: "C · Failure",
  D: "D · Document",
  E: "E · Change",
}

/** Port code from "INMUN — Mundra". */
const code = (port: string) => port.split(" — ")[0]

function StageStrip({ trade, className }: { trade: W.Trade; className?: string }) {
  return (
    <span className={cn("flex gap-[2px]", className)} aria-label={`Stage ${trade.currentStage} of 16`}>
      {W.STAGES.map((stage) => (
        <span key={stage.n} className={cn("h-1 flex-1 rounded-full", STAGE_SEGMENT[stageStateFor(trade, stage.n)])} />
      ))}
    </span>
  )
}

function counterparty(trade: W.Trade, perspective: TradePerspective): string {
  if (perspective === "internal") return W.buyerById(trade.buyerId)?.company ?? "—"
  if (perspective === "buyer") {
    const growers = trade.sellerIds.map((id) => W.sellerById(id)?.entity).filter(Boolean)
    return growers.length > 1 ? `${growers[0]} +${growers.length - 1}` : (growers[0] ?? "—")
  }
  return trade.destination
}

/** A small icon with its count; the words live in the tooltip. */
function Signal({ icon: Icon, count, label, tone }: { icon: typeof ThermometerIcon; count: number; label: string; tone: "warn" | "crit" }) {
  if (count === 0) return null
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[11.5px] font-semibold tabular-nums",
              tone === "crit" ? "text-destructive" : "text-status-warning"
            )}
          />
        }
      >
        <Icon aria-hidden className="size-3.5" />
        {count}
        <span className="sr-only"> {label}</span>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  )
}

function TradeCard({ trade, perspective, href }: { trade: W.Trade; perspective: TradePerspective; href: string }) {
  const product = W.productById(trade.productId)
  const variant = W.variantById(trade.variantId)
  const stage = W.stageByNo(trade.currentStage)
  const record = currentRecord(trade)
  const scenario = record && record.scenario !== "A" ? record.scenario : null
  const exceptions = exceptionStages(trade).length
  const gates = trade.status === "closed" ? 0 : openGates(trade).length
  const excursions = W.EXCURSIONS.filter((excursion) => excursion.tradeId === trade.id).length
  const closed = trade.status === "closed"
  const due = closed ? null : dueLabel(trade.nextAction.dueAt)

  return (
    <Link
      href={href}
      className="group block rounded-[16px] border border-border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-[border-color,box-shadow] hover:border-foreground/20 hover:shadow-[0_4px_14px_-6px_rgba(0,0,0,0.15)]"
    >
      <span className="block px-3.5 pt-3">
        <span className="flex items-start justify-between gap-2">
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-semibold text-foreground">{product?.label}</span>
            <span className="block truncate text-[12px] text-muted-foreground">
              {variant?.label} · <Mono className="text-[11px]">{trade.id.replace("AMT-2026-", "")}</Mono>
            </span>
          </span>
          <Status tone={TRADE_STATUS_TONE[trade.status]} className="mt-0.5">
            {TRADE_STATUS_LABEL[trade.status]}
          </Status>
        </span>

        <span className="mt-2.5 grid grid-cols-2 gap-x-3 text-[12px]">
          <span className="min-w-0">
            <span className="block text-[11px] text-muted-foreground">Route</span>
            <span className="block truncate font-medium text-foreground">
              {code(trade.portOfLoading)} → {code(trade.portOfDischarge)}
            </span>
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] text-muted-foreground">Volume</span>
            <span className="block truncate font-medium text-foreground tabular-nums">{trade.qtyContractedMt} MT</span>
          </span>
        </span>
        <span className="mt-1.5 block truncate text-[11.5px] text-muted-foreground" title={counterparty(trade, perspective)}>
          {counterparty(trade, perspective)}
        </span>
      </span>

      <span className="mt-3 block border-t border-border px-3.5 py-2.5">
        <span className="flex items-center justify-between gap-2 text-[12px]">
          <span className="min-w-0 truncate font-medium text-foreground">
            <span className="font-mono text-amama-deep">{pad2(trade.currentStage)}</span> {stage.short}
          </span>
          {scenario ? (
            <Pill tone={SCENARIO_TONE[scenario]} className="px-1.5">
              {scenario}
            </Pill>
          ) : null}
        </span>
        <StageStrip trade={trade} className="mt-2" />
      </span>

      <span className="flex min-h-9 items-center justify-between gap-2 border-t border-border px-3.5 py-2">
        <span className="flex items-center gap-2.5">
          <Signal icon={FileWarningIcon} count={gates} label={`${gates} open document gate${gates === 1 ? "" : "s"}`} tone="crit" />
          <Signal icon={ThermometerIcon} count={excursions} label={`${excursions} temperature excursion${excursions === 1 ? "" : "s"}`} tone="crit" />
          <Signal icon={AlertTriangleIcon} count={exceptions} label={`${exceptions} stage${exceptions === 1 ? "" : "s"} off the normal path`} tone="warn" />
          {gates + excursions + exceptions === 0 ? <span className="text-[11.5px] text-muted-foreground">Clean</span> : null}
        </span>
        {due ? (
          <span className={cn("shrink-0 text-[11.5px] font-semibold tabular-nums", due.tone === "crit" ? "text-destructive" : due.tone === "warn" ? "text-status-warning" : "text-muted-foreground")}>
            {due.text}
          </span>
        ) : (
          <span className="text-[11.5px] text-muted-foreground">Settled</span>
        )}
      </span>
    </Link>
  )
}

/** A horizontal scroller that, on desktop, spans the whole canvas edge to
 *  edge but pads its content back in line with the page — so the first
 *  column starts where the heading does and only scrolling carries the
 *  columns out to the edges. */
function BleedScroller({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [bleed, setBleed] = React.useState({ left: 0, right: 0 })

  React.useLayoutEffect(() => {
    const node = ref.current
    const column = node?.parentElement
    const canvas = node?.closest("main")
    if (!node || !column || !canvas) return
    const desktop = window.matchMedia("(min-width: 768px)")
    const measure = () => {
      if (!desktop.matches) {
        setBleed({ left: 0, right: 0 })
        return
      }
      const inner = column.getBoundingClientRect()
      const outer = canvas.getBoundingClientRect()
      setBleed({
        left: Math.max(0, Math.round(inner.left - outer.left)),
        right: Math.max(0, Math.round(outer.left + canvas.clientWidth - inner.right)),
      })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(canvas)
    observer.observe(column)
    desktop.addEventListener("change", measure)
    return () => {
      observer.disconnect()
      desktop.removeEventListener("change", measure)
    }
  }, [])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        marginLeft: -bleed.left,
        marginRight: -bleed.right,
        paddingLeft: bleed.left,
        paddingRight: bleed.right,
        scrollPaddingInline: `${bleed.left}px ${bleed.right}px`,
      }}
    >
      {children}
    </div>
  )
}

function columnsFor(grouping: Grouping, trades: W.Trade[]) {
  if (grouping === "phase") {
    return W.PHASES.map((phase) => ({
      key: phase.id,
      title: phase.label,
      caption: `${pad2(phase.stages[0])}–${pad2(phase.stages[1])}`,
      trades: trades.filter((trade) => W.phaseForStage(trade.currentStage).id === phase.id),
    }))
  }
  if (grouping === "stage") {
    return W.STAGES.map((stage) => ({
      key: String(stage.n),
      title: stage.short,
      caption: pad2(stage.n),
      trades: trades.filter((trade) => trade.currentStage === stage.n),
    }))
  }
  return STATUS_ORDER.map((status) => ({
    key: status,
    title: TRADE_STATUS_LABEL[status],
    caption: "",
    trades: trades.filter((trade) => trade.status === status),
  }))
}

function Board({ trades, perspective, basePath }: { trades: W.Trade[]; perspective: TradePerspective; basePath: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const view: View = searchParams.get("view") === "board" ? "board" : "list"
  const groupParam = searchParams.get("group")
  const grouping: Grouping = groupParam === "stage" || groupParam === "status" ? groupParam : "phase"
  const chainParam = searchParams.get("chain")
  const chain = chainParam && chainParam in CHAIN_ITEMS ? chainParam : "all"
  const [query, setQuery] = React.useState(searchParams.get("q") ?? "")

  const setParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) params.delete(key)
      else params.set(key, value)
    }
    const next = params.toString()
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false })
  }

  const needle = query.trim().toLowerCase()
  const visible = trades
    .filter((trade) => {
      if (chain !== "all" && !W.stageRecordsForTrade(trade.id).some((record) => record.scenario === chain && record.state !== "pending")) {
        return false
      }
      if (!needle) return true
      return [
        trade.id,
        W.productById(trade.productId)?.label,
        W.variantById(trade.variantId)?.label,
        trade.origin,
        trade.destination,
        trade.portOfLoading,
        trade.portOfDischarge,
        perspective === "internal" ? W.buyerById(trade.buyerId)?.company : "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    })
    .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.currentStage - b.currentStage)

  const live = trades.filter((trade) => trade.status !== "closed")
  const attention = live.filter((trade) => trade.status === "at-risk" || trade.status === "blocked")
  const gates = live.reduce((sum, trade) => sum + openGates(trade).length, 0)
  const volume = live.reduce((sum, trade) => sum + trade.qtyContractedMt, 0)
  const value = live.reduce((sum, trade) => sum + trade.qtyContractedMt * trade.priceUsdPerMt, 0)
  const hrefFor = (trade: W.Trade) => `${basePath}/${trade.id}`

  return (
    <div className={PAGE_TABS_SPACE}>
      <h1 className="text-[28px] font-bold tracking-tight">Trades</h1>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Live" value={live.length} caption={`${trades.length - live.length} closed`} />
        <StatTile
          label="At risk"
          value={attention.length}
          tone={attention.length > 0 ? "warning" : "plain"}
          caption="At risk or blocked"
        />
        <StatTile label="Open gates" value={gates} tone={gates > 0 ? "critical" : "plain"} caption="Mandatory documents" />
        {perspective === "seller" ? (
          <StatTile label="Volume" value={`${volume.toFixed(0)} MT`} caption="Live trades" />
        ) : (
          <StatTile label="Value" value={`$${(value / 1_000_000).toFixed(2)}M`} caption="Live trades" />
        )}
      </div>

      <PageTabs
        label="View"
        className="mt-5"
        value={view}
        onChange={(next) => setParams({ view: next === "list" ? null : next })}
        tabs={[
          { value: "list", label: "List", icon: ListIcon },
          { value: "board", label: "Board", icon: Columns3Icon },
        ]}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <SearchIcon aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setParams({ q: event.target.value.trim() || null })
            }}
            placeholder="Search"
            aria-label="Search trades"
            className="h-9 rounded-full ps-9"
          />
        </div>
        {view === "board" ? (
          <Select items={GROUP_ITEMS} value={grouping} onValueChange={(next) => setParams({ group: next === "phase" || !next ? null : String(next) })}>
            <SelectTrigger aria-label="Group by" className="bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(GROUP_ITEMS) as Grouping[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {GROUP_ITEMS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <Select items={CHAIN_ITEMS} value={chain} onValueChange={(next) => setParams({ chain: next === "all" || !next ? null : String(next) })}>
          <SelectTrigger aria-label="Scenario" className={cn("bg-card", chain !== "all" && "border-foreground/40")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(CHAIN_ITEMS).map((key) => (
              <SelectItem key={key} value={key}>
                {CHAIN_ITEMS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ScenarioInfo />
        <span className="ms-auto hidden text-[12px] text-muted-foreground tabular-nums sm:block">
          {visible.length} of {trades.length}
        </span>
      </div>

      {visible.length === 0 ? (
        <div className="mt-5">
          <EmptyNote>No trades match</EmptyNote>
        </div>
      ) : view === "board" ? (
        <BleedScroller className="mt-4 flex gap-3 overflow-x-auto pb-3">
          {columnsFor(grouping, visible).map((column) =>
            column.trades.length === 0 ? (
              <section
                key={column.key}
                aria-label={`${column.title}, empty`}
                title={`${column.title} · empty`}
                className="flex w-11 shrink-0 flex-col items-center gap-2.5 rounded-[20px] bg-muted/50 py-3 transition-[width] duration-300"
              >
                <span className="text-[12px] font-medium text-muted-foreground tabular-nums">0</span>
                <h2 className="text-[12.5px] font-semibold whitespace-nowrap text-muted-foreground [writing-mode:vertical-rl]">
                  {column.title}
                  {column.caption ? <span className="ms-1.5 font-mono text-[11px] font-normal">{column.caption}</span> : null}
                </h2>
              </section>
            ) : (
              <section
                key={column.key}
                className={cn(
                  "flex shrink-0 flex-col rounded-[20px] bg-muted/70 transition-[width] duration-300",
                  grouping === "phase" ? "w-[264px] 2xl:w-auto 2xl:min-w-[250px] 2xl:flex-1 2xl:basis-0" : "w-[264px]"
                )}
              >
                <header className="flex items-center justify-between gap-2 px-3.5 pt-3 pb-2">
                  <h2 className="flex min-w-0 items-baseline gap-1.5 text-[13px] font-semibold text-foreground">
                    <span className="truncate">{column.title}</span>
                    {column.caption ? <span className="font-mono text-[11px] font-normal text-muted-foreground">{column.caption}</span> : null}
                  </h2>
                  <span className="text-[12px] font-medium text-muted-foreground tabular-nums">{column.trades.length}</span>
                </header>
                <div className="flex min-h-20 flex-col gap-2 px-2 pb-2">
                  {column.trades.map((trade) => (
                    <TradeCard key={trade.id} trade={trade} perspective={perspective} href={hrefFor(trade)} />
                  ))}
                </div>
              </section>
            )
          )}
        </BleedScroller>
      ) : (
        <div className="mt-4 overflow-hidden rounded-[20px] border border-border bg-card">
          <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_9rem_8rem_7rem_1rem] gap-4 border-b border-border px-5 py-2.5 text-[11.5px] text-muted-foreground lg:grid">
            <span>Trade</span>
            <span>Stage</span>
            <span>Scenario</span>
            <span>Due</span>
            <span>Status</span>
            <span />
          </div>
          <ul className="divide-y divide-border">
            {visible.map((trade) => (
              <li key={trade.id}>
                <TradeListRow trade={trade} perspective={perspective} href={hrefFor(trade)} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <BookBlockers trades={live} hrefFor={hrefFor} />
    </div>
  )
}

function TradeListRow({ trade, perspective, href }: { trade: W.Trade; perspective: TradePerspective; href: string }) {
  const product = W.productById(trade.productId)
  const variant = W.variantById(trade.variantId)
  const stage = W.stageByNo(trade.currentStage)
  const record = currentRecord(trade)
  const due = trade.status === "closed" ? null : dueLabel(trade.nextAction.dueAt)

  return (
    <Link
      href={href}
      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-3 transition-colors hover:bg-muted lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_9rem_8rem_7rem_1rem]"
    >
      <span className="min-w-0">
        <span className="block truncate text-[13.5px] font-semibold text-foreground">
          {product?.label} · {variant?.label}
        </span>
        <span className="block truncate text-[12px] text-muted-foreground">
          <Mono className="text-[11.5px]">{trade.id}</Mono> · {trade.qtyContractedMt} MT · {code(trade.portOfLoading)} →{" "}
          {code(trade.portOfDischarge)} · {counterparty(trade, perspective)}
        </span>
      </span>
      <span className="hidden min-w-0 lg:block">
        <span className="block truncate text-[12.5px] font-medium text-foreground">
          <span className="font-mono text-amama-deep">{pad2(trade.currentStage)}</span> {stage.short}
        </span>
        <StageStrip trade={trade} className="mt-1.5" />
      </span>
      <span className="hidden lg:block">
        {record && record.scenario !== "A" ? (
          <Pill tone={SCENARIO_TONE[record.scenario]}>
            {record.scenario} · {scenarioMeta(record.scenario).label}
          </Pill>
        ) : (
          <span className="text-[12px] text-muted-foreground">Normal</span>
        )}
      </span>
      <span className="hidden text-[12px] font-medium tabular-nums lg:block">
        {due ? (
          <span className={due.tone === "crit" ? "text-destructive" : due.tone === "warn" ? "text-status-warning" : "text-muted-foreground"}>
            {due.text}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </span>
      <Status tone={TRADE_STATUS_TONE[trade.status]}>{TRADE_STATUS_LABEL[trade.status]}</Status>
      <ChevronRightIcon aria-hidden className="hidden size-4 text-muted-foreground lg:block" />
    </Link>
  )
}

/** Every open gate and excursion across these trades, each a link into
 *  the tab it belongs to. */
function BookBlockers({ trades, hrefFor }: { trades: W.Trade[]; hrefFor: (trade: W.Trade) => string }) {
  const gates = trades.flatMap((trade) => openGates(trade).map((document) => ({ trade, document })))
  const ids = new Set(trades.map((trade) => trade.id))
  const excursions = W.EXCURSIONS.filter((excursion) => ids.has(excursion.tradeId)).sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  if (gates.length === 0 && excursions.length === 0) return null

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2 lg:items-start">
      {gates.length > 0 ? (
        <section className="overflow-hidden rounded-[20px] border border-border bg-card">
          <header className="flex items-center justify-between px-5 pt-3.5 pb-3">
            <h2 className="text-[14px] font-semibold text-foreground">Open gates</h2>
            <span className="text-[12px] text-muted-foreground tabular-nums">{gates.length}</span>
          </header>
          <ul className="divide-y divide-border border-t border-border">
            {gates.map(({ trade, document }) => (
              <li key={document.id}>
                <Link href={`${hrefFor(trade)}?tab=stages&stage=${document.stage}`} className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-muted">
                  <Dot tone={DOC_STATUS_TONE[document.status]} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-foreground">{document.name}</span>
                    <span className="block truncate text-[12px] text-muted-foreground">
                      {W.productById(trade.productId)?.label} · <Mono className="text-[11.5px]">{trade.id}</Mono> · {pad2(document.stage)}
                    </span>
                  </span>
                  <Status tone={DOC_STATUS_TONE[document.status]}>{DOC_STATUS_LABEL[document.status]}</Status>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {excursions.length > 0 ? (
        <section className="overflow-hidden rounded-[20px] border border-border bg-card">
          <header className="flex items-center justify-between px-5 pt-3.5 pb-3">
            <h2 className="text-[14px] font-semibold text-foreground">Excursions</h2>
            <span className="text-[12px] text-muted-foreground tabular-nums">{excursions.length}</span>
          </header>
          <ul className="divide-y divide-border border-t border-border">
            {excursions.map((excursion) => {
              const trade = W.tradeById(excursion.tradeId)
              if (!trade) return null
              return (
                <li key={excursion.id}>
                  <Link href={`${hrefFor(trade)}?tab=shipment`} className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-muted">
                    <ThermometerIcon aria-hidden className="size-4 shrink-0 text-destructive" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-foreground tabular-nums">
                        {excursion.peakTempC} °C vs {excursion.setpointC} °C · {excursion.durationMin} min
                      </span>
                      <span className="block truncate text-[12px] text-muted-foreground">
                        {W.productById(trade.productId)?.label} · <Mono className="text-[11.5px]">{trade.id}</Mono>
                      </span>
                    </span>
                    <span className={cn("text-[12px] font-semibold tabular-nums", excursion.shelfLifeDebitDays >= 3 ? "text-destructive" : "text-status-warning")}>
                      −{excursion.shelfLifeDebitDays} d
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

/** `useSearchParams` drives view, grouping and filters, so the board
 *  carries its own Suspense boundary. */
function TradeBoard(props: { trades: W.Trade[]; perspective: TradePerspective; basePath: string }) {
  return (
    <React.Suspense fallback={<div className="h-64 animate-pulse rounded-[20px] bg-muted" />}>
      <Board {...props} />
    </React.Suspense>
  )
}

export { StageStrip, TradeBoard }
