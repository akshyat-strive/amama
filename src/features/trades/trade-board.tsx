"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AlertTriangleIcon, FileWarningIcon, GitPullRequestArrowIcon, SearchIcon, ThermometerIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { COLUMN_HEIGHT, ColumnCard } from "@/components/ui/column-card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import * as W from "@/features/tradechain/demo-world"
import { exceptionStages, openGates } from "@/features/tradechain/trade-file"
import { OrderRow, OrderRows } from "@/features/orders/order-row"
import type { TradePerspective } from "@/features/trades/trade-access"
import { TRADE_STATUS_LABEL, TRADE_STATUS_TONE, dueLabel, pad2 } from "@/features/trades/trade-format"
import { ScenarioInfo } from "@/features/trades/trade-info"
import { EmptyNote, Status } from "@/features/trades/trade-ui"

const STATUS_ORDER: W.TradeStatus[] = ["blocked", "at-risk", "active", "closed"]

const CHAIN_ITEMS: Record<string, string> = {
  all: "Any scenario",
  B: "B · Delay",
  C: "C · Failure",
  D: "D · Document",
  E: "E · Change",
}

const COUNTERPARTY_LABEL: Record<TradePerspective, string> = { internal: "Buyer", buyer: "Grower", seller: "Destination" }

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

function Board({
  trades,
  perspective,
  basePath,
  title = "Trades",
  action,
}: {
  trades: W.Trade[]
  perspective: TradePerspective
  basePath: string
  title?: string
  action?: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

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
        counterparty(trade, perspective),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    })
    .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.currentStage - b.currentStage)

  const pendingChanges = W.CHANGE_REQUESTS.filter((request) => request.status === "awaiting-approval").length

  return (
    <ColumnCard
      title={title}
      action={
        action ??
        (perspective === "internal" ? (
          <Link
            href={`${basePath}/changes`}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-card px-4 text-[13px] font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <GitPullRequestArrowIcon aria-hidden className="size-4" />
            Change requests
            {pendingChanges > 0 ? (
              <span className="grid min-w-5 place-items-center rounded-full bg-status-warning px-1.5 text-[11px] font-bold text-white tabular-nums">{pendingChanges}</span>
            ) : null}
          </Link>
        ) : null)
      }
      toolbar={
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <SearchIcon aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setParams({ q: event.target.value.trim() || null })
              }}
              placeholder="Search"
              aria-label={`Search ${title.toLowerCase()}`}
              className="h-9 rounded-full border-transparent bg-card ps-9"
            />
          </div>
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
      }
    >
      {visible.length === 0 ? (
        <EmptyNote>No {title.toLowerCase()} match</EmptyNote>
      ) : (
        <OrderRows counterparty={COUNTERPARTY_LABEL[perspective]}>
          {visible.map((trade) => (
            <TradeRow key={trade.id} trade={trade} perspective={perspective} href={`${basePath}/${trade.id}`} />
          ))}
        </OrderRows>
      )}
    </ColumnCard>
  )
}

function TradeRow({ trade, perspective, href }: { trade: W.Trade; perspective: TradePerspective; href: string }) {
  const product = W.productById(trade.productId)
  const variant = W.variantById(trade.variantId)
  const stage = W.stageByNo(trade.currentStage)
  const closed = trade.status === "closed"
  const due = closed ? null : dueLabel(trade.nextAction.dueAt)
  const gates = closed ? 0 : openGates(trade).length
  const exceptions = exceptionStages(trade).length

  return (
    <OrderRow
      href={href}
      title={`${product?.label ?? "Trade"} · ${variant?.label ?? ""}`}
      orderId={trade.id}
      counterparty={counterparty(trade, perspective)}
      quantity={`${trade.qtyContractedMt} MT`}
      status={<Status tone={TRADE_STATUS_TONE[trade.status]}>{TRADE_STATUS_LABEL[trade.status]}</Status>}
      stage={`${pad2(trade.currentStage)} ${stage.short}`}
      when={due ? due.text : "Settled"}
      whenClassName={due?.tone === "crit" ? "font-medium text-destructive" : due?.tone === "warn" ? "font-medium text-status-warning" : undefined}
      signals={
        <span className="flex shrink-0 items-center gap-2">
          <Signal icon={FileWarningIcon} count={gates} label={`${gates} open document gate${gates === 1 ? "" : "s"}`} tone="crit" />
          <Signal icon={AlertTriangleIcon} count={exceptions} label={`${exceptions} stage${exceptions === 1 ? "" : "s"} off the normal path`} tone="warn" />
        </span>
      }
    />
  )
}

/** `useSearchParams` drives the filters, so the list carries its own
 *  Suspense boundary. */
function TradeBoard(props: { trades: W.Trade[]; perspective: TradePerspective; basePath: string; title?: string; action?: React.ReactNode }) {
  return (
    <React.Suspense fallback={<div className={cn("animate-pulse rounded-[24px] bg-background", COLUMN_HEIGHT)} />}>
      <Board {...props} />
    </React.Suspense>
  )
}

export { TradeBoard }
