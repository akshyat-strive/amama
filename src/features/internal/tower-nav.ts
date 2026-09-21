import {
  BanknoteIcon,
  ClipboardListIcon,
  FileCheckIcon,
  FileSignatureIcon,
  MessagesSquareIcon,
  PackageIcon,
  ScrollTextIcon,
  SettingsIcon,
  ShipIcon,
  ShoppingBagIcon,
  ThermometerIcon,
  type LucideIcon,
} from "lucide-react"

import * as W from "@/features/tradechain/demo-world"

/**
 * The internal product's primary navigation — nine sections, each with its
 * own contextual rail. This is the Slack-style workspace spine: the icon
 * rail never changes, the column beside it changes completely.
 */
export type TowerSection = {
  id: string
  label: string
  href: string
  icon: LucideIcon
  /** What the contextual rail is a list *of*, shown as its heading. */
  railLabel: string
}

/**
 * The rail follows the deal's own order — marketplace, chat, RFQ, term
 * sheet, order, shipment — rather than grouping by module. A KAM's mental
 * model of the work is a pipeline, so the nav that matches it needs no
 * learning. The `band` splits it into the three jobs the business
 * actually has, and the rail puts a gap between bands (proximity).
 */
export type NavBand = "commercial" | "execution" | "back-office"

export const TOWER_SECTIONS: (TowerSection & { band: NavBand })[] = [
  { id: "marketplace", label: "Marketplace", href: "/internal/marketplace", icon: ShoppingBagIcon, railLabel: "Categories", band: "commercial" },
  { id: "conversations", label: "Chats", href: "/internal/conversations", icon: MessagesSquareIcon, railLabel: "Threads", band: "commercial" },
  { id: "rfqs", label: "RFQs", href: "/internal/rfqs", icon: ScrollTextIcon, railLabel: "Requests", band: "commercial" },
  { id: "term-sheets", label: "Term Sheets", href: "/internal/term-sheets", icon: FileSignatureIcon, railLabel: "Negotiations", band: "commercial" },
  { id: "orders", label: "Orders", href: "/internal/orders", icon: ClipboardListIcon, railLabel: "Orders", band: "execution" },
  { id: "trades", label: "Trades", href: "/internal/trades", icon: PackageIcon, railLabel: "Trades", band: "execution" },
  { id: "shipments", label: "Shipments", href: "/internal/shipments", icon: ShipIcon, railLabel: "Shipments", band: "execution" },
  { id: "documents", label: "Documents", href: "/internal/documents", icon: FileCheckIcon, railLabel: "Document control", band: "execution" },
  { id: "cold-chain", label: "Cold Chain", href: "/internal/cold-chain", icon: ThermometerIcon, railLabel: "Cold chain", band: "execution" },
  { id: "finance", label: "Finance", href: "/internal/finance", icon: BanknoteIcon, railLabel: "Settlement", band: "back-office" },
  { id: "settings", label: "Settings", href: "/internal/settings", icon: SettingsIcon, railLabel: "Admin", band: "back-office" },
]

export const sectionForPath = (pathname: string): TowerSection | undefined =>
  [...TOWER_SECTIONS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((section) => pathname === section.href || pathname.startsWith(`${section.href}/`))

/** One row in the contextual rail. `dot` is the stage/status indicator —
 *  a trade's stage colour, a thread's unread state, a document's gate. */
export type RailItem = {
  id: string
  label: string
  href: string
  meta?: string
  dot?: "ok" | "warn" | "crit" | "brand" | "muted"
  badge?: number
}

const tradeDot = (trade: W.Trade): RailItem["dot"] =>
  trade.status === "blocked" ? "crit" : trade.status === "at-risk" ? "warn" : trade.status === "closed" ? "muted" : "ok"

/**
 * What the rail shows for a given section. Every list here is read from
 * `demo-world` — no screen invents its own rows, which is what keeps a
 * trade's stage identical in the rail, on its detail page and in the peek
 * panel.
 */
export function railItemsFor(sectionId: string): RailItem[] {
  switch (sectionId) {
    case "marketplace":
      return W.CATEGORIES.map((category) => ({
        id: category.id,
        label: category.label,
        href: `/internal/marketplace?category=${category.id}`,
        meta: `${W.productsForCategory(category.id).length} products`,
      }))

    case "conversations":
      return [...W.CONVERSATIONS]
        .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
        .map((conversation) => ({
          id: conversation.id,
          label: conversation.subject,
          href: `/internal/conversations/${conversation.id}`,
          meta: conversation.kind === "internal" ? "Internal" : conversation.kind === "buyer-kam" ? "Buyer" : "Seller",
          dot: conversation.unread > 0 ? "brand" : "muted",
          badge: conversation.unread || undefined,
        }))

    case "rfqs":
      return [...W.RFQS]
        .sort((a, b) => b.raisedAt.localeCompare(a.raisedAt))
        .map((rfq) => ({
          id: rfq.id,
          label: rfq.id,
          href: `/internal/rfqs/${rfq.id}`,
          meta: `${W.buyerById(rfq.buyerId)?.company ?? ""} · ${rfq.qtyMt} MT`,
          dot: rfq.status === "awarded" ? "ok" : rfq.status === "lost" || rfq.status === "expired" ? "muted" : "warn",
        }))

    case "term-sheets":
      return W.TERM_SHEETS.map((sheet) => {
        const agreed = sheet.clauses.filter((clause) => clause.status === "agreed").length
        return {
          id: sheet.id,
          label: sheet.id,
          href: `/internal/term-sheets/${sheet.id}`,
          meta: `${W.buyerById(sheet.buyerId)?.company ?? ""} · ${agreed}/${sheet.clauses.length}`,
          dot: sheet.status === "signed" ? "ok" : sheet.status === "rejected" ? "crit" : "warn",
        }
      })

    case "trades":
      return [...W.TRADES]
        .sort((a, b) => a.currentStage - b.currentStage)
        .map((trade) => ({
          id: trade.id,
          label: trade.id,
          href: `/internal/trades/${trade.id}`,
          meta: `${String(trade.currentStage).padStart(2, "0")} · ${W.stageByNo(trade.currentStage).short}`,
          dot: tradeDot(trade),
        }))

    case "orders":
      return W.PURCHASE_ORDERS.map((po) => ({
        id: po.id,
        label: po.id,
        href: `/internal/orders/${po.id}`,
        meta: `${W.buyerById(po.buyerId)?.company ?? ""} · ${po.qtyMt} MT`,
        dot:
          po.status === "pending-confirmation" ? "warn"
          : po.status === "cancelled" ? "muted"
          : "ok",
      }))

    case "shipments":
      return [...W.SHIPMENTS]
        .sort((a, b) => a.etd.localeCompare(b.etd))
        .map((shipment) => ({
          id: shipment.id,
          label: shipment.id,
          href: `/internal/shipments/${shipment.id}`,
          meta: `${shipment.vessel} · ${shipment.status}`,
          dot:
            shipment.status === "delivered" ? "muted"
            : shipment.status === "in-transit" ? "brand"
            : shipment.status === "at-terminal" ? "warn"
            : "ok",
        }))

    case "documents": {
      const blocking = W.blockingDocuments()
      return W.TRADES.filter((trade) => W.documentsForTrade(trade.id).length > 0).map((trade) => {
        const open = blocking.filter((document) => document.tradeId === trade.id).length
        return {
          id: trade.id,
          label: trade.id,
          href: `/internal/documents?trade=${trade.id}`,
          meta: open > 0 ? `${open} open gate${open === 1 ? "" : "s"}` : "Complete",
          dot: open > 0 ? "crit" : "ok",
          badge: open || undefined,
        }
      })
    }

    case "cold-chain":
      return W.CONTAINERS.map((container) => ({
        id: container.id,
        label: container.id,
        href: `/internal/cold-chain?container=${encodeURIComponent(container.id)}`,
        meta: `${container.setpointC} °C · ${container.state}`,
        dot: container.state === "sailed" || container.state === "gated-in" ? "ok" : "warn",
      }))

    case "finance":
      return W.TRADES.map((trade) => ({
        id: trade.id,
        label: trade.id,
        href: `/internal/finance?trade=${trade.id}`,
        meta: `${(trade.qtyContractedMt * trade.priceUsdPerMt).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}`,
        dot: trade.status === "closed" ? "ok" : "muted",
      }))

    case "settings":
      return [
        { id: "team", label: "Team & roles", href: "/internal/team" },
        { id: "review-queue", label: "Review queue", href: "/internal/review-queue" },
        { id: "listings", label: "Listing moderation", href: "/internal/listings" },
        { id: "announcements", label: "Announcements", href: "/internal/announcements" },
        { id: "profile", label: "My profile", href: "/internal/profile" },
        { id: "settings", label: "Account settings", href: "/internal/settings" },
      ]

    default:
      return []
  }
}
